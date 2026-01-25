import mongoose from 'mongoose';

const solutionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  problem: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  solution: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  keywords: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  category: {
    type: String,
    required: true,
    enum: ['Hardware', 'Software', 'Netzwerk', 'Account', 'Email', 'Sonstiges'],
    default: 'Sonstiges'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Index für bessere Suchperformance
solutionSchema.index({ title: 'text', problem: 'text', solution: 'text', keywords: 'text' }, {
  name: 'text_search_index',
  default_language: 'german'
});
solutionSchema.index({ category: 1 });
solutionSchema.index({ isActive: 1, updatedAt: -1 });
solutionSchema.index({ keywords: 1, isActive: 1 });


export default mongoose.model('Solution', solutionSchema);
