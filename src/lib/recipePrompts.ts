export const RECIPE_IDEA_PROMPTS = [
  'vegetarian chili',
  'one pan meal with chicken',
  'shrimp pasta',
  'sheet pan dinner',
  'quick weeknight stir fry',
  'freezer-friendly soup',
  'meal prep for the week',
  'low carb dinner',
  'kid-friendly pasta',
  'spicy noodle bowl',
  'slow cooker beef stew',
  'grilled cheese with a twist',
  'breakfast for dinner',
  'high protein lunch',
  'vegan burrito bowl',
  'instant pot risotto',
  'leftover rice makeover',
  'easy taco night',
  'comfort food casserole',
  'summer salad with protein',
  'budget-friendly dinner',
  'air fryer chicken thighs',
  'creamy soup with what I have',
  'pasta bake for a crowd',
  '30-minute dinner',
]

export function getRandomPrompts(count = 5): string[] {
  const shuffled = [...RECIPE_IDEA_PROMPTS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
