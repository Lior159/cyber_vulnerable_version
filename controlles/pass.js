const {
  verifyPassword,
  encryptPassword,
  validatePassword,
  sendEmail,
} = require("../utils/passwords");
const { getPool } = require("../utils/db");
const { encode } = require("html-entities");
const sql = require("mssql");
const otpGenerator = require("otp-generator");

const getPasswordUpdatePage = (req, res) => {
  res.render("update_password");
};

const updatePassword = async (req, res) => {
  try {
    const uname = req.session.uname;
    const inputCurPassword = req.body.curPassword;
    const inputNewPassword = req.body.newPassword;

    let db_res = await getPool()
      .request()
      .query(
        `SELECT TOP 3 password, status, email FROM users
      WHERE uname = '${uname}'
      ORDER BY created_at DESC 
      `
      );

    if (db_res.recordset.length === 0) {
      return res.render("update_password", {
        errorMessage: "Username not found. Please try again",
      });
    }

    const email = db_res.recordset[0].email;
    const [{ password: curPassword }] = db_res.recordset.filter(
      (row) => row.status === "active"
    );

    if (!verifyPassword(inputCurPassword, curPassword)) {
      return res.render("update_password", {
        errorMessage: "Incorrect password. Please try again",
      });
    }

    const { hash } = await encryptPassword(inputNewPassword);

    db_res = await getPool()
      .request()
      .query(
        `UPDATE users
        SET status = 'inactive'
        WHERE uname = '${uname}' AND status = 'active';
        INSERT INTO users (uname, password, email, created_at, status) VALUES ('${uname}', '${hash}', '${email}', GETDATE(), 'active');`
      );

    res.redirect("/login");
  } catch (error) {
    console.log(error);
    res.status(500).send("Intenal server error");
  }
};

const getForgotPasswordPage = (req, res) => {
  res.render("forgot_password");
};

const sendOTP = async (req, res) => {
  try {
    const uname = req.body.uname;

    const db_res = await getPool()
      .request()
      .query(
        `SELECT email FROM users
        WHERE uname = '${uname}' AND status = 'active'
      `
      );

    if (db_res.recordset.length === 0) {
      return res.render("forgot_password", {
        errorMessage: "Username not found. Please try again",
      });
    }

    const email = db_res.recordset[0].email;

    const otp = otpGenerator.generate(10, {
      upperCaseAlphabets: true,
      specialChars: true,
    });

    const { hash } = await encryptPassword(otp);

    await getPool()
      .request()
      .query(
        `UPDATE users
        SET otp = '${hash}', otp_expire = DATEADD(minute, 10, GETDATE())
        WHERE uname = '${uname}' AND status = 'active';`
      );

    await sendEmail({ uname, to: email, otp });

    res.render("forgot_password", {
      successMessage: `Check your email inbox for a message from us`,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Intenal server error");
  }
};

const getResetPasswordPage = (req, res) => {
  const uname = req.params.uname;

  return res.render("reset_password", {
    uname,
  });
};

const setNewPassword = async (req, res) => {
  try {
    const uname = req.body.uname;
    const inputOtp = req.body.otp;
    const newPassword = req.body.newPassword;

    const db_res = await getPool()
      .request()
      .input("uname", sql.VarChar, uname)
      .query(
        `SELECT TOP 3 password, status, email,otp FROM users
      WHERE uname = '${uname}'
      ORDER BY created_at DESC 
      `
      );

    if (db_res.recordset.length === 0) {
      return res.render("reset_password", {
        uname,
        errorMessage: "Invalid url - username not found",
      });
    }

    const email = db_res.recordset[0].email;
    const [{ otp }] = db_res.recordset.filter((row) => row.status === "active");

    if (!otp || !verifyPassword(inputOtp, otp)) {
      return res.render("reset_password", {
        uname,
        errorMessage: "Invalid OTP",
      });
    }

    const { hash } = await encryptPassword(newPassword);

    await getPool()
      .request()
      .query(
        `UPDATE users
        SET status = 'inactive'
        WHERE uname = '${uname}' AND status = 'active';
        INSERT INTO users (uname, password, email, created_at, status) VALUES ('${uname}', '${hash}', '${email}', GETDATE(), 'active');`
      );

    res.redirect("/login");
  } catch (error) {
    console.log(error);
    res.status(500).send("Intenal server error");
  }
};

module.exports = {
  getPasswordUpdatePage,
  updatePassword,
  getForgotPasswordPage,
  sendOTP,
  getResetPasswordPage,
  setNewPassword,
};
