const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("server is running");
    });
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
};

initializeDbAndServer();

//API to setup password

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashPassword = await bcrypt.hash(password, 10);

  const checkUserPresent = `SELECT * 
        FROM user
        WHERE username LIKE '${username}';`;
  const dbUser = await db.get(checkUserPresent);
  if (dbUser === undefined) {
    if (password.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const createUserQuery = `INSERT INTO 
            user
            (username,name,password,gender,location)
            VALUES
            ('${username}',
            '${name}',
            '${hashPassword}',
            '${gender}',
            '${location}');`;
      await db.run(createUserQuery);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

// API FOR LOGIN

app.post("/login", async (request, response) => {
  const { username, password } = request.body;

  const checkUser = `SELECT * FROM user WHERE username LIKE '${username}';`;
  const resQuery = await db.get(checkUser);
  if (resQuery === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatch = await bcrypt.compare(password, resQuery.password);
    if (isPasswordMatch === true) {
      response.status(200);
      response.send("Login success");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//API FOR CHANGE PASSWORD

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;

  const resQuery = `SELECT * FROM user WHERE username LIKE '${username}';`;
  const query = await db.get(resQuery);
  if (query === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPdMatch = await bcrypt.compare(oldPassword, query.password);
    if (isPdMatch === true) {
      if (newPassword.length < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        const addNewPdQuery = `UPDATE user SET password = '${newHashedPassword}';`;
        await db.run(addNewPdQuery);
        response.status(200);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});
