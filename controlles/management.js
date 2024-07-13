const { getPool } = require("../utils/db");
const { encode } = require("html-entities");
const sql = require("mssql");
const validator = require("validator");

const getNewCustomerPage = (req, res) => {
  res.render("create_customer");
};

const createCustomer = async (req, res) => {
  try {
    const id = req.body.id.trim();
    const full_name = req.body.full_name.trim();
    const email = req.body.email.trim();
    const phone = req.body.phone.trim();
    const birth_date = req.body.birth_date.trim();
    const gender = req.body.gender.trim();
    const street = req.body.street.trim();
    const city = req.body.city.trim();
    const post_code = req.body.post_code.trim();
    const created_by = req.session.uname;

    const db_res = await getPool()
      .request()
      .query(
        `IF NOT EXISTS (SELECT 1 FROM customers WHERE id = '${id}')
        BEGIN
          INSERT INTO customers (id, full_name, email, phone, birth_date, gender, street, city, post_code, created_by)
          VALUES ('${id}', '${full_name}', '${email}', '${phone}', '${birth_date}', '${gender}', '${street}', '${city}', '${post_code}', '${created_by}');
        END`
      );

    if (db_res.rowsAffected.length === 0) {
      return res.render("create_customer", {
        errorMessage: "Customer is already exist",
      });
    }

    return res.render("new_customer", {
      full_name,
      id,
      email,
      phone,
      birth_date: new Intl.DateTimeFormat("en-GB").format(new Date(birth_date)),
      gender,
      street,
      city,
      post_code,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Intenal server error");
  }
};

const validateCustomer = ({
  id,
  full_name,
  email,
  phone,
  birth_date,
  gender,
  street,
  city,
  post_code,
}) => {
  if (!validateID(id)) {
    return "Invalid ID";
  }

  if (
    !validator.isAlpha(full_name.replace(" ", ""), "he") &&
    !validator.isAlpha(full_name.replace(" ", ""), "en-US")
  ) {
    return "Invald Full Name, must contain only Hebrow or English letters)";
  }

  if (!validator.isEmail(email)) {
    return "Invalid Email";
  }

  if (!validator.isMobilePhone(phone, "he-IL")) {
    return "Invalid Phone Number";
  }

  if (!validator.isDate(birth_date)) {
    return "Invalid Birth Date";
  }

  if (gender !== "male" && gender !== "female") {
    return "Invalid Gender";
  }

  if (
    !validator.isAlphanumeric(street.replace(" ", ""), "he") &&
    !validator.isAlphanumeric(street.replace(" ", ""), "en-US")
  ) {
    return "Invalid Street Adress";
  }

  if (
    !validator.isAlpha(city.replace(" ", ""), "he") &&
    !validator.isAlpha(city.replace(" ", ""), "en-US")
  ) {
    return "Invalid City";
  }

  if (!validator.isPostalCode(post_code, "IL")) {
    return "Invalid Post code";
  }
};

const validateID = (id) => {
  if (id.length !== 9 || isNaN(id)) {
    return false;
  }
  let sum = 0,
    incNum;
  for (let i = 0; i < id.length; i++) {
    incNum = Number(id[i]) * ((i % 2) + 1); // Multiply number by 1 or 2
    sum += incNum > 9 ? incNum - 9 : incNum; // Sum the digits up and add to total
  }
  return sum % 10 === 0;
};

module.exports = {
  getNewCustomerPage,
  createCustomer,
};
