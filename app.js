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
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser !== undefined) {
    response.status(400).send("User already exists");
    return;
  }

  if (password.length < 5) {
    response.status(400).send("Password is too short");
    return;
  }

  const createUserQuery = `
    INSERT INTO 
      user (username, name, password, gender, location) 
    VALUES 
      (
        '${username}', 
        '${name}',
        '${hashedPassword}', 
        '${gender}',
        '${location}'
      )`;

  try {
    const dbResponse = await db.run(createUserQuery);
    const newUserId = dbResponse.lastID;
    response.status(200).send(`User created successfully`);
  } catch (error) {
    console.error("Error creating user:", error);
    response.status(500).send("Internal Server Error");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);

  // Check if the user exists
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400).send("Invalid user");
    return;
  }

  // Compare the provided password with the stored hashed password
  const passwordMatch = await bcrypt.compare(password, dbUser.password);
  if (!passwordMatch) {
    response.status(400).send("Invalid password");
    return;
  }

  response.status(200).send("Login success!");
});

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;

  // Check if the user exists
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400).send("Invalid user");
    return;
  }

  // Compare the provided current password with the stored hashed password
  const passwordMatch = await bcrypt.compare(oldPassword, dbUser.password);
  if (!passwordMatch) {
    response.status(400).send("Invalid current password");
    return;
  }

  // Check if the new password is too short
  if (newPassword.length < 5) {
    response.status(400).send("Password is too short");
    return;
  }

  // Hash the new password
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);

  // Update the user's password
  const updatePasswordQuery = `
    UPDATE user
    SET password = '${hashedNewPassword}'
    WHERE username = '${username}'`;

  try {
    await db.run(updatePasswordQuery);
    response.status(200).send("Password updated");
  } catch (error) {
    console.error("Error updating password:", error);
    response.status(500).send("Internal Server Error");
  }
});

module.exports = app;
