const { TextractClient, AnalyzeDocumentCommand } = require("@aws-sdk/client-textract");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

const textractClient = new TextractClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });

const BUCKET_NAME = process.env.BUCKET_NAME;

exports.handler = async (event) => {
    const { documentKey } = JSON.parse(event.body);  // Assuming the receipt image key in S3 is passed in the request body

    try {
        // Retrieve the document from S3
        const stream = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: documentKey
        }));

        // Prepare and send the request to Textract
        const params = {
            Document: {
                Bytes: stream.Body
            },
            FeatureTypes: ["FORMS"]  // You can specify ["TABLES", "FORMS"] depending on your needs
        };

        const data = await textractClient.send(new AnalyzeDocumentCommand(params));

        // Process Textract data to extract required information
        const extractedData = data.Blocks.filter(block => block.BlockType === 'LINE').map(line => line.Text);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Receipt processed successfully',
                extractedData: extractedData
            }),
        };
    } catch (error) {
        console.error('Error processing receipt image:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Failed to process receipt image',
                error: error.message
            }),
        };
    }
};
