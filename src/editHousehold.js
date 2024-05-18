const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
    const { authorizationToken, householdId, householdName, customHouseholdNameSuchAsCrew, account, ipAddress, deviceDetails } = JSON.parse(event.body);

    if (!authorizationToken) {
        return {
            statusCode: 401,
            body: JSON.stringify({
                message: 'Access denied. No token provided.'
            })
        };
    }

    let userUuid;

    try {
        // Invoke verifyToken Lambda function
        const verifyTokenCommand = new InvokeCommand({
            FunctionName: 'verifyToken', // Replace with the actual function name
            Payload: JSON.stringify({ authorizationToken })
        });

        // Parallelize token verification and initial database fetch
        const [verifyTokenResponse, household] = await Promise.all([
            lambdaClient.send(verifyTokenCommand),
            prisma.household.findUnique({
                where: { householdId },
                include: { members: true }
            })
        ]);

        const payload = JSON.parse(new TextDecoder('utf-8').decode(verifyTokenResponse.Payload));
        if (verifyTokenResponse.FunctionError) {
            throw new Error(payload.errorMessage || 'Token verification failed.');
        }

        userUuid = payload.username;
        if (!userUuid) {
            throw new Error('Token verification did not return a valid UUID.');
        }

        if (!household) {
            console.log(`Error: Household ${householdId} does not exist`);
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Household not found',
                }),
            };
        }

        const isOwner = household.members.some(member => member.memberUuid === userUuid && member.role === 'Owner');
        if (!isOwner) {
            console.log(`Error: User ${userUuid} is not authorized to edit household ${householdId}`);
            return {
                statusCode: 403,
                body: JSON.stringify({
                    message: 'User is not authorized to edit this household',
                }),
            };
        }

        const updatedHousehold = await prisma.household.update({
            where: { householdId },
            data: {
                householdName,
                customHouseholdNameSuchAsCrew,
                account,
                updatedAt: new Date()
            }
        });

        await prisma.auditTrail.create({
            data: {
                auditId: uuidv4(),
                tableAffected: 'Household',
                actionType: 'Update',
                oldValue: JSON.stringify(household),
                newValue: JSON.stringify(updatedHousehold),
                changedBy: userUuid,
                changeDate: new Date(),
                timestamp: new Date(),
                device: deviceDetails,
                ipAddress: ipAddress,
                deviceType: '',
                ssoEnabled: 'false',
            },
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Household updated successfully',
                household: updatedHousehold,
            }),
        };
    } catch (error) {
        console.error('Error updating household:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Error updating household',
                error: error.message,
            }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
