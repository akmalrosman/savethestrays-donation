const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
var serviceAccount = require("./key.json");

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

const bp = require("body-parser");
const ph = require("password-hash");
const uniqId = require("uniqid");
const session = require("express-session");
const express = require("express");
var cors = require('cors');
const app = express();

app.set("view engine", "ejs");
app.use(bp.urlencoded({ extended: true }));
app.use(bp.json());
app.use(
  session({
    secret: "Strays Cat donation app",
    resave: true,
    saveUninitialized: true,
  })
);
app.use(express.static('public'));
app.use(cors());

// app.get("/", function (req, res) {
//   res.render("main");
// });

app.get("/donlogin", function (req, res) {
  res.render("don_login", { errState: false });
});

app.get("/donRegister", function (req, res) {
  res.render("don_register", { sucState: false, errState: false });
});

//don_register.ejs page
app.post("/don_register_submit", function (req, res) {
  const email = req.body.email;
  const psw = req.body.psw;
  const c_psw = req.body.c_psw;
  db.collection("Donors")
    .where("email", "==", email)
    .get()
    .then((docs) => {
      if (docs.size > 0) {
        res.render("don_register", {
          sucState: false,
          errState: true,
          errMsg: "Donor Already Exists.!",
        });
      } else {
        if (psw == c_psw) {
          db.collection("Donors")
            .add({
              Donor_name: req.body.user_name,
              email: email,
              password: ph.generate(psw),
              ph_no: req.body.phone_no,
              state: req.body.state,
              zipcode: req.body.zipcode,
              city: req.body.city,
              street: req.body.street,
            })
            .then(() => {
              res.render("don_register", { sucState: true, errState: false });
            });
        } else {
          res.render("don_register", {
            sucState: false,
            errState: true,
            errMsg: "Pasword Doesn't Match.!",
          });
        }
      }
    });
});

app.post("/don_login_submit", function (req, res) {
  const email = req.body.email;
  const psw = req.body.psw;
  db.collection("Donors")
    .where("email", "==", email)
    .get()
    .then((docs) => {
      if (docs.size == 0) {
        res.render("don_login", {
          errState: true,
          errMsg: "Donor not Found.!",
        });
      } else {
        const userData = docs.docs[0].data();
        if (!ph.verify(psw, userData.password)) {
          // Incorrect password
          res.render("don_login", {
            errState: true,
            errMsg: "Incorrect password.!",
          });
        } else {
          // Successful login
          req.session.userEmail = email;
          res.render("don_home", { name: userData.Donor_name });
        }
      }
    });
});

app.get("/donat_vacc", async function (req, res) {
  const user_email = req.session.userEmail;
  // console.log(user_email);
  const don_data = await db
    .collection("Donors")
    .where("email", "==", user_email)
    .get();
  // console.log(don_data.docs[0].data());
  res.render("vacc_donate_form", {
    don_details: don_data.docs[0].data(),
  });
});

app.post("/donat_vacc_submit", async function (req, res) {
  const donationID = uniqId();
  const date = new Date();
  const user_email = req.session.userEmail;
  const don_data = db.collection("Donors").where("email", "==", user_email);
  const donSnapshot = await don_data.get();
  //
  const donDoc = donSnapshot.docs[0];
  const donHisRef = donDoc.ref.collection("Donation_History");
  await donHisRef.add({
    DonationId: donationID,
    Date: date.getMonth() + "/" + date.getDate() + "/" + date.getFullYear(),
    Donate_for: req.body.Donation,
    Donation_cost: req.body.donationCost,
    address:
      donSnapshot.docs[0].data().street +
      ", " +
      donSnapshot.docs[0].data().zipcode +
      " " +
      donSnapshot.docs[0].data().city +
      ", " +
      donSnapshot.docs[0].data().state,
    Card_Name: req.body.cardName,
    Card_Num: req.body.cardNumber,
    Expiry_Date: req.body.expiryDate,
    Cvv: req.body.cvv,
    Status: "Collected",
  });
});

app.get("/donat_med", async function (req, res) {
  const user_email = req.session.userEmail;
  // console.log(user_email);
  const don_data = await db
    .collection("Donors")
    .where("email", "==", user_email)
    .get();
  // console.log(don_data.docs[0].data());
  res.render("med_donate_form", {
    don_details: don_data.docs[0].data(),
  });
});

app.post("/donat_med_submit", async function (req, res) {
  const donationID = uniqId();
  const date = new Date();
  const user_email = req.session.userEmail;
  const don_data = db.collection("Donors").where("email", "==", user_email);
  const donSnapshot = await don_data.get();
  //
  const donDoc = donSnapshot.docs[0];
  const donHisRef = donDoc.ref.collection("Donation_History");
  await donHisRef.add({
    DonationId: donationID,
    Date: date.getMonth() + "/" + date.getDate() + "/" + date.getFullYear(),
    Donate_for: req.body.Donation,
    Donation_cost: req.body.donationCost,
    address:
      donSnapshot.docs[0].data().street +
      ", " +
      donSnapshot.docs[0].data().zipcode +
      " " +
      donSnapshot.docs[0].data().city +
      ", " +
      donSnapshot.docs[0].data().state,
    Card_Name: req.body.cardName,
    Card_Num: req.body.cardNumber,
    Expiry_Date: req.body.expiryDate,
    Cvv: req.body.cvv,
    Status: "Collected",
  });
});

app.get("/don_history", async (req, res) => {
  const donor_email = req.session.userEmail;

  const donQuery = db.collection("Donors").where("email", "==", donor_email);
  const donSnapshot = await donQuery.get();
  const don_name = donSnapshot.docs[0].data().Donor_name;

  //"Donation_History" subcollection
  const donHistoryRef = donSnapshot.docs[0].ref.collection("Donation_History");
  const donData = await donHistoryRef.get();
  const don_his_data = donData.docs.map((doc) => doc.data());

  res.render("don_history", {
    name: don_name,
    dataArr: { don_his_data },
  });
});

app.get("/don_profile", async (req, res) => {
  const don_email = req.session.userEmail;

  // "Donors" collection to get donor data
  const donorQuery = db.collection("Donors").where("email", "==", don_email);
  const donorSnapshot = await donorQuery.get();
  const don_data = donorSnapshot.docs[0].data();

  //"Donation_History" subcollection
  const donHisRef = donorSnapshot.docs[0].ref.collection("Donation_History");
  const donHis = await donHisRef.get();
  const no_donations = donHis.size;
  res.render("don_profile", { don_data, no_donations });
});

app.get("/", async (req, res) => {
  try {
    let totalSum = 0;
    const donorsSnapshot = await db.collection("Donors").get();
    for (const donorDoc of donorsSnapshot.docs) {
      const donationHistoryRef = donorDoc.ref.collection("Donation_History");
      const donationHistorySnapshot = await donationHistoryRef.get();
      donationHistorySnapshot.forEach((donationDoc) => {
        const donation = donationDoc.data();
        const donationCost = parseFloat(donation.Donation_cost);
        if (!isNaN(donationCost)) {
          totalSum += donationCost;
        }
      });
    }

    res.render("main", { totalSum });
  } catch (error) {
    console.error("Error calculating total donations:", error);
    res.render("main", { totalSum: 0 });
  }
});

app.get("/don_home", (req, res) => {
  const don_email = req.session.userEmail;
  db.collection("Donors")
    .where("email", "==", don_email)
    .get()
    .then((docs) => {
      const name = docs.docs[0].data().Donor_name;
      res.render("don_home", { name });
    });
});

app.get("/logout", async (req, res) => {
  req.session.destroy();

  let totalSum = 0;
  try {
    const donorsSnapshot = await db.collection("Donors").get();
    for (const donorDoc of donorsSnapshot.docs) {
      const donationHistoryRef = donorDoc.ref.collection("Donation_History");
      const donationHistorySnapshot = await donationHistoryRef.get();
      donationHistorySnapshot.forEach((donationDoc) => {
        const donation = donationDoc.data();
        const donationCost = parseFloat(donation.Donation_cost);
        if (!isNaN(donationCost)) {
          totalSum += donationCost;
        }
      });
  }

  res.render("main", { totalSum });
  } catch (error) {
    console.error("Error calculating total donations:", error);
    res.render("main", { totalSum: 0 });
  }
});

app.listen(3000, () => {
  console.log("Server runs on port 3000");
});