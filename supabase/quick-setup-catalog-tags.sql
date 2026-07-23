-- Quick Pantry Setup — tags the curated ~50-item staple list used by the
-- onboarding "Quick Pantry Setup" card/flow. Run this in the Supabase SQL
-- Editor after seed-catalog.sql has already been run.
-- Safe to re-run: array_append is skipped for rows that already have the tag.

update public.catalog
set tags = array_append(tags, 'quick-setup')
where name in (
  -- Canned Goods
  'Diced Tomatoes', 'Black Beans', 'Chicken Broth', 'Tuna',
  -- Dry Goods & Grains
  'White Rice', 'Spaghetti', 'Oats', 'Red Lentils',
  -- Baking
  'All-Purpose Flour', 'White Sugar', 'Brown Sugar', 'Baking Soda', 'Vanilla Extract',
  -- Condiments & Sauces
  'Ketchup', 'Mayonnaise', 'Soy Sauce', 'Peanut Butter', 'Olive Oil',
  -- Snacks
  'Crackers', 'Tortilla Chips',
  -- Beverages
  'Coffee (Ground)', 'Orange Juice', 'Almond Milk',
  -- Frozen
  'Ground Beef', 'Frozen Peas', 'Frozen Broccoli',
  -- Dairy & Refrigerated
  'Milk (Whole)', 'Butter (Salted)', 'Cheddar Cheese', 'Eggs', 'Greek Yogurt', 'Sour Cream',
  -- Produce
  'Bananas', 'Apples', 'Lemons', 'Avocado', 'Yellow Onion', 'Garlic', 'Potatoes',
  -- Meat & Seafood
  'Chicken Breast (Fresh)',
  -- Spices & Seasonings
  'Kosher Salt', 'Black Pepper', 'Garlic Powder', 'Onion Powder', 'Cumin', 'Paprika', 'Italian Seasoning',
  -- Household & Other
  'Paper Towels', 'Dish Soap', 'Trash Bags'
)
and not ('quick-setup' = any(tags));
