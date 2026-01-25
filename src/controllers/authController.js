import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import process from "process";
import { validateDto } from "../validation/validateDto.js";
import { authLoginDto, authRegisterDto } from "../validation/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
dotenv.config();

const signToken = (id, role, email, name) => {
  return jwt.sign({ id, role, email, name }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || "12h",
  });
};

// Registrierung eines neuen Benutzers
// Gibt ein Token und die User-ID zurück
export const register = asyncHandler(async (req, res) => {
  const { email, password, name } = validateDto(authRegisterDto, req.body);

  // name wird jetzt auch gespeichert
  const newUser = await User.create({ email, password, name, role: "user" });

  // name wird dem Token hinzugefügt
  const token = signToken(
    newUser._id,
    newUser.role,
    newUser.email,
    newUser.name
  );

  // Sende Token und User-ID zurück
  res.status(201).json({ token, userId: newUser._id });
});

// Login eines Benutzers
// Gibt ein Token und die User-ID zurück
export const login = asyncHandler(async (req, res) => {
  const { email, password } = validateDto(authLoginDto, req.body);

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const isMatch = await user.correctPassword(password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = signToken(user._id, user.role, user.email, user.name);

  // Sende Token und User-ID zurück
  res.status(200).json({ token, userId: user._id });
});

// Alle Admins abrufen (für Ticket-Zuweisung)
export const getAdmins = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Finde alle User mit Rolle 'admin'
  const admins = await User.find({
    role: { $in: ["admin", "support1"] },
  }).select("name email _id role");

  if (!admins || admins.length === 0) {
    return res.status(200).json([]);
  }

  res.status(200).json(admins);
});
