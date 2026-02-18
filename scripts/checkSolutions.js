import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Solution from '../src/models/solutionModel.js';

dotenv.config();

async function checkSolutions() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Verbindung zur MongoDB hergestellt');

    const count = await Solution.countDocuments();
    console.log(`📊 Anzahl Lösungen in der Datenbank: ${count}`);

    if (count > 0) {
      const solutions = await Solution.find().select('title category').limit(10);
      console.log('\n🗂️ Vorhandene Lösungen:');
      solutions.forEach((sol, idx) => {
        console.log(`${idx + 1}. ${sol.title} (${sol.category})`);
      });

      // Kategorien-Statistik
      const categoryStats = await Solution.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      console.log('\n📈 Statistiken nach Kategorie:');
      categoryStats.forEach(stat => {
        console.log(`- ${stat._id}: ${stat.count}`);
      });
    }

  } catch (error) {
    console.error('❌ Fehler:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nVerbindung geschlossen');
  }
}

checkSolutions();
