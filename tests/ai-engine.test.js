// Mock dependencies for AIEngine
global.Utils = require('../js/utils');
global.I18n = require('../js/i18n');
global.KB = require('../js/knowledge-base');

const AIEngine = require('../js/ai-engine');

describe('AIEngine module', () => {
  describe('Intent Classification', () => {
    test('should classify greetings', () => {
      expect(AIEngine.classifyIntent('hello there')).toBe(AIEngine.INTENTS.GREETING);
    });

    test('should classify food queries', () => {
      expect(AIEngine.classifyIntent('I want to buy a burger')).toBe(AIEngine.INTENTS.FOOD);
      expect(AIEngine.classifyIntent('is there halal food?')).toBe(AIEngine.INTENTS.FOOD);
    });

    test('should classify emergency queries', () => {
      expect(AIEngine.classifyIntent('sos help')).toBe(AIEngine.INTENTS.EMERGENCY);
      expect(AIEngine.classifyIntent('there is a fire')).toBe(AIEngine.INTENTS.EMERGENCY);
    });

    test('should classify sustainability and staff queries', () => {
      expect(AIEngine.classifyIntent('how do I recycle?')).toBe(AIEngine.INTENTS.SUSTAINABILITY);
      expect(AIEngine.classifyIntent('enable staff mode')).toBe(AIEngine.INTENTS.STAFF);
    });

    test('should fallback to general intent for unknown queries', () => {
      expect(AIEngine.classifyIntent('can I bring my dog?')).toBe(AIEngine.INTENTS.GENERAL); // Assuming dog is not caught
    });
  });

  describe('Response Generation (Demo mode)', () => {
    test('should respond to food intent', async () => {
      const response = await AIEngine.respond('hungry for some nachos');
      expect(response).toContain('Food & Drink');
    });
    
    test('should handle unsafe input gracefully', async () => {
      const response = await AIEngine.respond('<script>alert("xss")</script>');
      expect(response).toContain('⚠️');
    });
  });
});
