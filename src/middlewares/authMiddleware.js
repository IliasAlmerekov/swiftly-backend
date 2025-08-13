import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import process from "process";

// Middleware zur Authentifizierung des Benutzers
// Prüft das JWT-Token und fügt die User-Info zu req.user hinzu
const authMiddleware = async (req, res, next) => {
  try {
    // Token aus dem Header holen
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Kein Token gefunden" });
    }
    const token = authHeader.split(" ")[1];

    // Token verifizieren
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // User aus der Datenbank holen
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "Benutzer nicht gefunden" });
    }

    // User-Info an die Anfrage anhängen
    req.user = user;
    next();
  } catch (error) {
    res
      .status(401)
      .json({ message: "Nicht autorisiert", error: error.message });
  }
};

export default authMiddleware;
