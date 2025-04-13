const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const userSchema = new mongoose.Schema({
  userName: { type: String, unique: true },
  password: String,
  email: String,
  loginHistory: [{ dateTime: Date, userAgent: String }]
});

let User;

module.exports.initialize = () => {
  return new Promise((resolve, reject) => {
    let db = mongoose.createConnection("mongodb+srv://aawaran789:28OZgxl3VwYEi3ds@web.h350f2j.mongodb.net/?retryWrites=true&w=majority&appName=web");
    db.on("error", (err) => reject(err));
    db.once("open", () => {
      User = db.model("users", userSchema);
      resolve();
    });
  });
};

module.exports.registerUser = function(userData) {
  return new Promise(async (resolve, reject) => {
    if (userData.password !== userData.password2) {
      reject("Passwords do not match");
      return;
    }

    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      userData.password = hashedPassword;

      const newUser = new User(userData);
      await newUser.save();
      resolve();
    } catch (err) {
      if (err.code === 11000) {
        reject("User Name already taken");
      } else {
        reject("There was an error creating the user: " + err);
      }
    }
  });
};

module.exports.checkUser = function(userData) {
  return new Promise(async (resolve, reject) => {
    try {
      const users = await User.find({ userName: userData.userName });

      if (users.length === 0) {
        reject("Unable to find user: " + userData.userName);
        return;
      }

      const match = await bcrypt.compare(userData.password, users[0].password);
      if (!match) {
        reject("Incorrect Password for user: " + userData.userName);
        return;
      }

      if (users[0].loginHistory.length === 8) {
        users[0].loginHistory.pop();
      }

      users[0].loginHistory.unshift({
        dateTime: new Date(),
        userAgent: userData.userAgent
      });

      await User.updateOne(
        { userName: users[0].userName },
        { $set: { loginHistory: users[0].loginHistory } }
      );

      resolve(users[0]);
    } catch (err) {
      reject("There was an error verifying the user: " + err);
    }
  });
};
