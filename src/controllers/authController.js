import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import process from "process";
dotenv.config();

const signToken = (id, role, email, name) => {
  return jwt.sign({ id, role, email, name }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

// Registrierung eines neuen Benutzers
// Gibt ein Token und die User-ID zurück
export const register = async (req, res) => {
  try {
    console.log("Registration attempt with data:", req.body);
    const { email, password, role, name } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      console.log("Missing required fields:", { email: !!email, password: !!password, name: !!name });
      return res.status(400).json({ 
        message: "Missing required fields", 
        required: ["email", "password", "name"],
        received: { email: !!email, password: !!password, name: !!name, role: !!role }
      });
    }

    console.log("Creating user with:", { email, name, role: role || 'user' });
    
    // name wird jetzt auch gespeichert
    const newUser = await User.create({ email, password, role, name });

    console.log("User created successfully:", newUser._id);

    // name wird dem Token hinzugefügt
    const token = signToken(
      newUser._id,
      newUser.role,
      newUser.email,
      newUser.name
    );

    // Sende Token und User-ID zurück
    res.status(201).json({ token, userId: newUser._id });
  } catch (error) {
    console.log("Registration error:", error);
    res
      .status(400)
      .json({ message: "Registration failed", error: error.message });
  }
};

// Login eines Benutzers
// Gibt ein Token und die User-ID zurück
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(410).json({ message: "User not found" });

    const isMatch = await user.correctPassword(password);
    if (!isMatch)
      return res.status(401).json({ message: "Incorrect Password" });

    const token = signToken(user._id, user.role, user.email, user.name);

    // Sende Token und User-ID zurück
    res.status(200).json({ token, userId: user._id });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

// Alle Admins abrufen (für Ticket-Zuweisung)
export const getAdmins = async (req, res) => {
  try {
    console.log("getAdmins called by user:", req.user);

    // Überprüfe, ob der anfragende User authentifiziert ist
    if (!req.user) {
      console.log("User not authenticated in getAdmins");
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Erst mal alle User anzeigen zur Debugging
    const allUsers = await User.find({}).select("name email role _id");
    console.log("All users in database:", allUsers);

    // Finde alle User mit Rolle 'admin'
    const admins = await User.find({ role: "admin" }).select("name email _id role");
    console.log("Found admins:", admins);
    console.log("Number of admins found:", admins.length);

    if (!admins || admins.length === 0) {
      console.log("No admin users found, returning empty array instead of 404");
      // Возвращаем пустой массив вместо 404 ошибки
      return res.status(200).json([]);
    }

    res.status(200).json(admins);
  } catch (error) {
    console.error("Error in getAdmins:", error);
    res.status(500).json({
      message: "Failed to fetch admin users",
      error: error.message,
    });
  }
};
