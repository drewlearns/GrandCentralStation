const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const reconcileSubscriptions = async () => {
  try {
    // Fetch unverified subscriptions that are not linked to any user
    const unverifiedSubscriptions = await prisma.unverifiedSubscription.findMany({
      where: { userUuid: null },
    });

    for (const subscription of unverifiedSubscriptions) {
      const { platformIdentifier } = subscription;

      // Find the user by platformIdentifier
      const user = await prisma.user.findUnique({
        where: { uuid: platformIdentifier },
      });

      if (user) {
        // Update the user's subscription details
        await prisma.user.update({
          where: { uuid: user.uuid },
          data: {
            subscriptionEndDate: subscription.subscriptionEndDate,
            subscriptionId: subscription.platformIdentifier,
            subscriptionStatus: subscription.notificationType === 'CANCEL' ? 'canceled' : 'active',
            purchaseToken: subscription.transactionId,
            receiptData: subscription.receiptData,
            updatedAt: new Date(),
          },
        });

        // Link the unverified subscription to the user
        await prisma.unverifiedSubscription.update({
          where: { id: subscription.id },
          data: { userUuid: user.uuid },
        });

        console.log(`Subscription for user ${user.uuid} updated successfully.`);
      } else {
        console.log(`User not found for platformIdentifier: ${platformIdentifier}`);
      }
    }
  } catch (error) {
    console.error('Error reconciling subscriptions:', error);
  } finally {
    await prisma.$disconnect();
  }
};

// Run the reconciliation
reconcileSubscriptions().catch((e) => console.error(e));
