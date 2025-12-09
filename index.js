const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.sendGiftCard = functions.https.onRequest(async (req, res) => {
  try {
    const { recipientEmail, amount } = req.body;
    if (!recipientEmail) {
      return res.status(400).send("Missing recipientEmail");
    }
    console.log("Sending gift card to", recipientEmail, "for", amount);
    return res.status(200).send("Email sent successfully!");
  } catch (error) {
    console.error("Error sending gift card:", error);
    return res.status(500).send("Internal Server Error");
  }
});

exports.cleanupExpiredBookings = functions.pubsub
  .schedule("every 5 minutes")
  .onRun(async (context) => {
    const now = new Date().toISOString();
    const expiredSnapshot = await admin.firestore()
      .collection("bookings")
      .where("paid", "==", false)
      .where("expiresAt", "<", now)
      .get();

    const batch = admin.firestore().batch();
    expiredSnapshot.forEach((doc) => {
      console.log(`🧹 Deleting expired unpaid booking: ${doc.id}`);
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`✅ Cleanup complete. Deleted ${expiredSnapshot.size} documents.`);
    return null;
  });
