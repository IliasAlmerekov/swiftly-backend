import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Solution from '../src/models/solutionModel.js';

// Umgebungsvariablen laden
dotenv.config();

// Sample Solutions Daten - typische Helpdesk Probleme
const sampleSolutions = [
  {
    title: "E-Mail kann nicht gesendet werden",
    problem: "Benutzer kann keine E-Mails versenden, erhält Fehlermeldungen beim Senden",
    solution: "1. Prüfen Sie Ihre Internetverbindung\n2. Überprüfen Sie die SMTP-Servereinstellungen in Ihrem E-Mail-Client\n3. Stellen Sie sicher, dass der SMTP-Port korrekt ist (meist 587 oder 465)\n4. Überprüfen Sie Benutzername und Passwort\n5. Bei weiteren Problemen kontaktieren Sie Ihren E-Mail-Provider",
    keywords: ["email", "smtp", "versenden", "outlook", "mail", "fehlermeldung"],
    category: "Email",
    priority: "Medium"
  },
  {
    title: "WLAN-Verbindungsprobleme",
    problem: "Computer oder Gerät kann sich nicht mit dem WLAN verbinden oder verliert ständig die Verbindung",
    solution: "1. Überprüfen Sie, ob das WLAN eingeschaltet ist\n2. Vergessen Sie das Netzwerk und verbinden Sie sich erneut\n3. Starten Sie Ihren Router neu (30 Sekunden vom Strom trennen)\n4. Prüfen Sie, ob andere Geräte sich verbinden können\n5. Aktualisieren Sie die WLAN-Treiber\n6. Starten Sie Ihr Gerät neu",
    keywords: ["wlan", "wifi", "internet", "verbindung", "router", "netzwerk"],
    category: "Netzwerk",
    priority: "High"
  },
  {
    title: "Passwort vergessen",
    problem: "Benutzer hat das Passwort für sein Benutzerkonto vergessen und kann sich nicht anmelden",
    solution: "1. Verwenden Sie die 'Passwort vergessen' Funktion auf der Anmeldeseite\n2. Überprüfen Sie Ihre E-Mails für den Zurücksetzungslink\n3. Falls keine E-Mail ankommt, prüfen Sie den Spam-Ordner\n4. Erstellen Sie ein starkes, neues Passwort\n5. Bei weiteren Problemen wenden Sie sich an den Administrator",
    keywords: ["passwort", "login", "anmeldung", "vergessen", "zurücksetzen", "account"],
    category: "Account",
    priority: "Medium"
  },
  {
    title: "Drucker druckt nicht",
    problem: "Drucker reagiert nicht auf Druckaufträge oder zeigt Fehlermeldungen an",
    solution: "1. Überprüfen Sie, ob der Drucker eingeschaltet und betriebsbereit ist\n2. Prüfen Sie die Kabelverbindungen (USB oder Netzwerk)\n3. Überprüfen Sie den Papierstau und Papiervorrat\n4. Prüfen Sie den Toner-/Tintenstand\n5. Starten Sie den Druckerspooler-Dienst neu\n6. Reinstallieren Sie die Druckertreiber",
    keywords: ["drucker", "drucken", "treiber", "papier", "toner", "tinte", "stau"],
    category: "Hardware",
    priority: "Low"
  },
  {
    title: "Software startet nicht",
    problem: "Eine Anwendung oder Software lässt sich nicht öffnen oder stürzt beim Start ab",
    solution: "1. Starten Sie die Anwendung als Administrator\n2. Überprüfen Sie, ob Updates verfügbar sind\n3. Starten Sie Ihren Computer neu\n4. Prüfen Sie, ob genügend Speicherplatz vorhanden ist\n5. Deinstallieren und neu installieren Sie die Software\n6. Überprüfen Sie die Systemanforderungen",
    keywords: ["software", "programm", "startet nicht", "absturz", "fehler", "installation"],
    category: "Software",
    priority: "Medium"
  },
  {
    title: "Langsamer Computer",
    problem: "Computer ist sehr langsam, Programme brauchen lange zum Laden, System reagiert träge",
    solution: "1. Starten Sie Ihren Computer neu\n2. Schließen Sie nicht benötigte Programme\n3. Überprüfen Sie den verfügbaren Speicherplatz\n4. Führen Sie eine Festplattenbereinigung durch\n5. Prüfen Sie auf Malware mit einem Antivirenprogramm\n6. Deaktivieren Sie nicht benötige Autostart-Programme",
    keywords: ["langsam", "performance", "träge", "speicher", "festplatte", "autostart"],
    category: "Hardware",
    priority: "Low"
  },
  {
    title: "Bildschirm bleibt schwarz",
    problem: "Monitor zeigt kein Bild an, bleibt schwarz obwohl Computer läuft",
    solution: "1. Überprüfen Sie, ob der Monitor eingeschaltet ist\n2. Prüfen Sie alle Kabelverbindungen (Strom und Daten)\n3. Testen Sie ein anderes Kabel\n4. Überprüfen Sie den richtigen Eingangskanal am Monitor\n5. Testen Sie den Monitor mit einem anderen Gerät\n6. Bei Laptop: Fn-Taste + Bildschirmtaste drücken",
    keywords: ["bildschirm", "monitor", "schwarz", "kein bild", "display", "kabel"],
    category: "Hardware",
    priority: "High"
  },
  {
    title: "Teams / Kanäle und Teams erscheinen nicht",
    problem: "In Microsoft Teams werden keine Kanäle oder Teams angezeigt, wenn Benutzer in Teams links in der Liste auf 'Teams' klickt.",
    solution: "Der Benutzer soll die 'Aktivitäten anklicken' und dort in einer 'Aktivität' auf 'Zu Kanal wechseln' klicken.",
    keywords: ["teams", "kanäle", "anzeigen", "aktivitäten", "wechseln"],
    category: "Software",
    priority: "Medium"
  },
];

// Verbindung zur MongoDB herstellen und Daten einfügen
async function seedSolutions() {
  try {
    console.log('🔌 Verbinde zur MongoDB...');
    console.log('MongoDB URI vorhanden:', !!process.env.MONGO_URI);
    
    // Verbindung zur Datenbank
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Verbindung zur MongoDB hergestellt');

    // Prüfen ob bereits Solutions existieren
    const existingSolutions = await Solution.countDocuments();
    console.log(`📊 Aktuelle Anzahl Solutions: ${existingSolutions}`);
    
    if (existingSolutions > 0) {
      console.log(`⚠️ Es existieren bereits ${existingSolutions} Lösungen in der Datenbank.`);
      console.log('Überspringe das Einfügen...');
      return;
    }

    // Sample-Lösungen einfügen
    console.log('📝 Füge Sample-Lösungen ein...');
    const insertedSolutions = await Solution.insertMany(sampleSolutions);
    
    console.log(`✅ ${insertedSolutions.length} Sample-Lösungen erfolgreich eingefügt:`);
    insertedSolutions.forEach((solution, index) => {
      console.log(`${index + 1}. ${solution.title} (${solution.category})`);
    });

    // Statistiken anzeigen
    const stats = await Solution.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('\n📊 Lösungen nach Kategorie:');
    stats.forEach(stat => {
      console.log(`- ${stat._id}: ${stat.count} Lösungen`);
    });

  } catch (error) {
    console.error('❌ Fehler beim Einfügen der Sample-Daten:', error);
    console.error('Stack:', error.stack);
  } finally {
    // Verbindung schließen
    await mongoose.connection.close();
    console.log('\n🔌 Datenbank-Verbindung geschlossen');
    process.exit(0);
  }
}

// Script ausführen
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSolutions();
}

export default seedSolutions;
