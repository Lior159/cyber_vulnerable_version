const { encode } = require("html-entities");
const sql = require("mssql");
const validator = require("validator");
const { getPool } = require("../utils/db");
const {
  verifyPassword,
  encryptPassword,
  validatePassword,
} = require("../utils/passwords");

const getLoginPage = (req, res) => {
  res.render("login");
};

const getSignupPage = (req, res) => {
  res.render("signup");
};

const login = async (req, res) => {
  try {
    const uname = req.body.uname;
    const password = req.body.password;

    const db_res = await getPool()
      .request()
      .query(
        `SELECT password FROM Users WHERE uname = '${uname}' AND status = 'active'`
      );

    if (db_res.recordset.length === 0) {
      return res.render("login", {
        errorMessage: "Username not found. Please try again",
      });
    }

    const { password: hash } = db_res.recordset[0];

    if (!verifyPassword(password, hash)) {
      return res.render("login", {
        errorMessage: "Incorrect password. Please try again",
      });
    }

    req.session.uname = uname;
    req.session.isAuth = true;
    req.session.save((err) => {
      if (err) {
        console.error("Error saving session:", err);
        return res.status(500).send("Internal Server Error");
      }
      res.redirect("/create_customer");
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Intenal server error");
  }
};

const signUp = async (req, res) => {
  try {
    const uname = req.body.uname;
    const password = req.body.password;
    const email = req.body.email;

    const { hash } = await encryptPassword(password);
    const db_res = await getPool()
      .request()
      .query(
        `IF NOT EXISTS (SELECT 1 FROM users WHERE uname = '${uname}')
        BEGIN
          INSERT INTO users (uname, password, email, created_at, status) VALUES ('${uname}', '${hash}', '${email}', GETDATE(), 'active');
        END`
      );

    if (db_res.rowsAffected.length === 0) {
      return res.render("signup", {
        errorMessage: "Username is already exist",
      });
    }

    return res.render("login");
  } catch (error) {
    console.log(error);
    res.status(500).send("Intenal server error");
  }
};

const logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
};

const isAuth = (req, res, next) => {
  if (!req.session.isAuth) {
    return res.render("login", {
      errorMessage: "You must login",
    });
  }
  next();
};

module.exports = {
  getLoginPage,
  getSignupPage,
  login,
  signUp,
  isAuth,
  logout,
};
