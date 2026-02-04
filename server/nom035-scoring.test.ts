import { describe, it, expect } from 'vitest';
import * as scoring from './lib/nom035-scoring';

describe('NOM-035 Scoring System', () => {
  describe('Guía I - Acontecimientos Traumáticos Severos', () => {
    it('should detect ATS when any answer is "Sí"', () => {
      const answers = [
        { questionId: 1, answerValue: 'Sí' },
        { questionId: 2, answerValue: 'No' },
        { questionId: 3, answerValue: 'No' },
        { questionId: 4, answerValue: 'No' },
      ];

      const result = scoring.calculateGuideIResult(answers);

      expect(result.atsDetected).toBe(true);
      expect(result.riskLevel).toBe('Muy alto');
      expect(result.score).toBe(1);
    });

    it('should not detect ATS when all answers are "No"', () => {
      const answers = [
        { questionId: 1, answerValue: 'No' },
        { questionId: 2, answerValue: 'No' },
        { questionId: 3, answerValue: 'No' },
        { questionId: 4, answerValue: 'No' },
      ];

      const result = scoring.calculateGuideIResult(answers);

      expect(result.atsDetected).toBe(false);
      expect(result.riskLevel).toBe('Nulo');
      expect(result.score).toBe(0);
    });
  });

  describe('Guía II - Empresas de 16 a 50 trabajadores', () => {
    it('should calculate Nulo risk level for score < 20', () => {
      const result = scoring.calculateGuideIIResult(15);

      expect(result.riskLevel).toBe('Nulo');
      expect(result.category).toBe('Nulo o despreciable');
    });

    it('should calculate Bajo risk level for score 20-44', () => {
      const result = scoring.calculateGuideIIResult(30);

      expect(result.riskLevel).toBe('Bajo');
      expect(result.category).toBe('Bajo');
    });

    it('should calculate Medio risk level for score 45-69', () => {
      const result = scoring.calculateGuideIIResult(55);

      expect(result.riskLevel).toBe('Medio');
      expect(result.category).toBe('Medio');
    });

    it('should calculate Alto risk level for score 70-89', () => {
      const result = scoring.calculateGuideIIResult(75);

      expect(result.riskLevel).toBe('Alto');
      expect(result.category).toBe('Alto');
    });

    it('should calculate Muy alto risk level for score >= 90', () => {
      const result = scoring.calculateGuideIIResult(95);

      expect(result.riskLevel).toBe('Muy alto');
      expect(result.category).toBe('Muy alto');
    });
  });

  describe('Guía III - Empresas de más de 50 trabajadores', () => {
    it('should calculate Nulo risk level for score < 50', () => {
      const result = scoring.calculateGuideIIIResult(40);

      expect(result.riskLevel).toBe('Nulo');
      expect(result.category).toBe('Nulo o despreciable');
    });

    it('should calculate Bajo risk level for score 50-74', () => {
      const result = scoring.calculateGuideIIIResult(60);

      expect(result.riskLevel).toBe('Bajo');
      expect(result.category).toBe('Bajo');
    });

    it('should calculate Medio risk level for score 75-98', () => {
      const result = scoring.calculateGuideIIIResult(85);

      expect(result.riskLevel).toBe('Medio');
      expect(result.category).toBe('Medio');
    });

    it('should calculate Alto risk level for score 99-139', () => {
      const result = scoring.calculateGuideIIIResult(110);

      expect(result.riskLevel).toBe('Alto');
      expect(result.category).toBe('Alto');
    });

    it('should calculate Muy alto risk level for score >= 140', () => {
      const result = scoring.calculateGuideIIIResult(150);

      expect(result.riskLevel).toBe('Muy alto');
      expect(result.category).toBe('Muy alto');
    });
  });

  describe('Total Score Calculation', () => {
    it('should calculate total score correctly', () => {
      const answers = [
        { questionId: 1, answerValue: 'Siempre' },
        { questionId: 2, answerValue: 'Casi siempre' },
        { questionId: 3, answerValue: 'Algunas veces' },
        { questionId: 4, answerValue: 'Casi nunca' },
        { questionId: 5, answerValue: 'Nunca' },
      ];

      const questions = [
        { id: 1, isReverseScored: false },
        { id: 2, isReverseScored: false },
        { id: 3, isReverseScored: false },
        { id: 4, isReverseScored: false },
        { id: 5, isReverseScored: false },
      ];

      const totalScore = scoring.calculateTotalScore(answers, questions);

      // Siempre=4, Casi siempre=3, Algunas veces=2, Casi nunca=1, Nunca=0
      expect(totalScore).toBe(10);
    });

    it('should handle reverse scored questions correctly', () => {
      const answers = [
        { questionId: 1, answerValue: 'Siempre' },
        { questionId: 2, answerValue: 'Nunca' },
      ];

      const questions = [
        { id: 1, isReverseScored: true },  // 4-4=0
        { id: 2, isReverseScored: true },  // 4-0=4
      ];

      const totalScore = scoring.calculateTotalScore(answers, questions);

      expect(totalScore).toBe(4);
    });
  });

  describe('Category Scores Calculation', () => {
    it('should calculate scores by category', () => {
      const answers = [
        { questionId: 1, answerValue: 'Siempre' },
        { questionId: 2, answerValue: 'Casi siempre' },
        { questionId: 3, answerValue: 'Algunas veces' },
      ];

      const questions = [
        { id: 1, category: 'Ambiente de trabajo', isReverseScored: false },
        { id: 2, category: 'Ambiente de trabajo', isReverseScored: false },
        { id: 3, category: 'Liderazgo', isReverseScored: false },
      ];

      const categoryScores = scoring.calculateCategoryScores(answers, questions);

      expect(categoryScores['Ambiente de trabajo']).toBe(7); // 4+3
      expect(categoryScores['Liderazgo']).toBe(2);
    });
  });

  describe('Recommendations', () => {
    it('should provide recommendations for each risk level', () => {
      const levels: scoring.RiskLevel[] = ['Nulo', 'Bajo', 'Medio', 'Alto', 'Muy alto'];

      levels.forEach(level => {
        const recommendations = scoring.getRecommendations(level, 'guia_ii');
        expect(recommendations).toBeInstanceOf(Array);
        expect(recommendations.length).toBeGreaterThan(0);
      });
    });

    it('should provide specific ATS recommendations for Guía I', () => {
      const recommendations = scoring.getRecommendations('Muy alto', 'guia_i');

      expect(recommendations).toContain('Se ha detectado un Acontecimiento Traumático Severo (ATS).');
      expect(recommendations.length).toBeGreaterThan(0);
    });
  });
});
