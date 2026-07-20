'use client'

import { useState, useMemo } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'

// Food-related emojis grouped by category.
// Each item has the emoji character (e) and search keywords (n).
const EMOJI_GROUPS = [
  { label: 'Fruits', items: [
    { e: '🍎', n: 'apple red' }, { e: '🍏', n: 'apple green' },
    { e: '🍐', n: 'pear' }, { e: '🍊', n: 'orange tangerine' },
    { e: '🍋', n: 'lemon citrus' }, { e: '🍌', n: 'banana' },
    { e: '🍍', n: 'pineapple tropical' }, { e: '🥭', n: 'mango tropical' },
    { e: '🍓', n: 'strawberry berry' }, { e: '🫐', n: 'blueberry berry' },
    { e: '🍇', n: 'grapes grape' }, { e: '🍈', n: 'melon' },
    { e: '🍉', n: 'watermelon' }, { e: '🍑', n: 'peach' },
    { e: '🍒', n: 'cherry cherries' }, { e: '🥝', n: 'kiwi' },
    { e: '🍅', n: 'tomato' }, { e: '🥥', n: 'coconut tropical' },
    { e: '🫒', n: 'olive oil' },
  ]},
  { label: 'Vegetables', items: [
    { e: '🥑', n: 'avocado' }, { e: '🥦', n: 'broccoli' },
    { e: '🥬', n: 'lettuce kale leafy green' }, { e: '🥒', n: 'cucumber' },
    { e: '🌽', n: 'corn maize' }, { e: '🥕', n: 'carrot' },
    { e: '🧅', n: 'onion' }, { e: '🧄', n: 'garlic' },
    { e: '🥔', n: 'potato' }, { e: '🍠', n: 'sweet potato yam' },
    { e: '🫘', n: 'beans legumes' }, { e: '🫑', n: 'bell pepper' },
    { e: '🌶️', n: 'chili pepper hot spicy' }, { e: '🫛', n: 'peas edamame green' },
    { e: '🍆', n: 'eggplant aubergine' }, { e: '🥜', n: 'peanuts nuts legume' },
    { e: '🌰', n: 'chestnut nut' },
  ]},
  { label: 'Meat & Protein', items: [
    { e: '🥩', n: 'meat steak beef red' }, { e: '🍗', n: 'chicken drumstick poultry' },
    { e: '🍖', n: 'meat bone pork' }, { e: '🥓', n: 'bacon' },
    { e: '🌭', n: 'hot dog sausage frank' }, { e: '🥚', n: 'egg raw' },
    { e: '🍳', n: 'egg fried pan breakfast' }, { e: '🐔', n: 'chicken whole poultry' },
    { e: '🦃', n: 'turkey' },
  ]},
  { label: 'Seafood', items: [
    { e: '🐟', n: 'fish' }, { e: '🦐', n: 'shrimp prawn' },
    { e: '🦑', n: 'squid calamari' }, { e: '🦞', n: 'lobster' },
    { e: '🦀', n: 'crab' }, { e: '🦪', n: 'oyster clam mussel' },
    { e: '🍤', n: 'fried shrimp' }, { e: '🐠', n: 'fish tropical' },
    { e: '🐡', n: 'fish blowfish' }, { e: '🐙', n: 'octopus' },
    { e: '🫙', n: 'jar preserved fish' },
  ]},
  { label: 'Dairy & Eggs', items: [
    { e: '🥛', n: 'milk glass dairy' }, { e: '🧀', n: 'cheese' },
    { e: '🧈', n: 'butter' }, { e: '🍦', n: 'ice cream soft serve dairy' },
    { e: '🍨', n: 'ice cream dairy' },
  ]},
  { label: 'Bread & Grains', items: [
    { e: '🍞', n: 'bread loaf white' }, { e: '🥐', n: 'croissant pastry' },
    { e: '🥖', n: 'baguette bread french' }, { e: '🫓', n: 'flatbread pita' },
    { e: '🥨', n: 'pretzel snack' }, { e: '🥯', n: 'bagel' },
    { e: '🧇', n: 'waffle breakfast' }, { e: '🥞', n: 'pancake stack breakfast' },
    { e: '🌾', n: 'grain wheat rice oats cereal' }, { e: '🍚', n: 'rice cooked' },
  ]},
  { label: 'Pasta & Noodles', items: [
    { e: '🍝', n: 'pasta spaghetti noodle' }, { e: '🍜', n: 'noodles ramen soup asian' },
    { e: '🍛', n: 'curry rice dish' }, { e: '🍲', n: 'pot stew soup food' },
    { e: '🫕', n: 'fondue hotpot' }, { e: '🥘', n: 'paella pan food dish' },
    { e: '🍱', n: 'bento box lunch japanese' }, { e: '🍣', n: 'sushi japanese' },
    { e: '🍙', n: 'rice ball onigiri' },
  ]},
  { label: 'Fast Food & Meals', items: [
    { e: '🍕', n: 'pizza slice' }, { e: '🍔', n: 'burger hamburger' },
    { e: '🌮', n: 'taco mexican' }, { e: '🌯', n: 'burrito wrap' },
    { e: '🥙', n: 'flatbread stuffed falafel' }, { e: '🍟', n: 'fries french fries' },
    { e: '🥪', n: 'sandwich sub' }, { e: '🧆', n: 'falafel balls' },
    { e: '🥗', n: 'salad green bowl' },
  ]},
  { label: 'Snacks & Sweets', items: [
    { e: '🍫', n: 'chocolate bar dark milk' }, { e: '🍿', n: 'popcorn snack' },
    { e: '🍪', n: 'cookie biscuit' }, { e: '🧁', n: 'cupcake muffin' },
    { e: '🍰', n: 'cake slice shortcake' }, { e: '🎂', n: 'birthday cake' },
    { e: '🍮', n: 'custard pudding flan' }, { e: '🍭', n: 'lollipop candy' },
    { e: '🍬', n: 'candy sweet hard' }, { e: '🍩', n: 'donut doughnut' },
    { e: '🥧', n: 'pie pastry' }, { e: '🍦', n: 'soft serve ice cream' },
    { e: '🍧', n: 'shaved ice dessert' }, { e: '🧃', n: 'juice box drink' },
  ]},
  { label: 'Beverages', items: [
    { e: '☕', n: 'coffee hot drink espresso' }, { e: '🍵', n: 'tea hot green' },
    { e: '🧋', n: 'bubble tea boba milk tea' }, { e: '🥤', n: 'cup soda drink cold' },
    { e: '🫖', n: 'teapot kettle tea' }, { e: '🍶', n: 'sake bottle' },
    { e: '🍺', n: 'beer mug ale' }, { e: '🍷', n: 'wine red glass' },
    { e: '🥂', n: 'champagne sparkling wine toast' }, { e: '🍸', n: 'cocktail martini' },
    { e: '🍹', n: 'tropical drink cocktail juice' }, { e: '🧉', n: 'mate herbal' },
  ]},
  { label: 'Condiments & Pantry', items: [
    { e: '🥫', n: 'canned food tin preserved' }, { e: '🫙', n: 'jar preserved condiment' },
    { e: '🧂', n: 'salt shaker seasoning' }, { e: '🍯', n: 'honey pot jar' },
    { e: '🥜', n: 'peanut butter nuts' }, { e: '🌿', n: 'herb fresh green' },
    { e: '🫚', n: 'oil ginger cooking' }, { e: '🫛', n: 'peas beans green' },
  ]},
]

// Avatar-friendly emoji set — animal faces, fun/fantasy faces, and food-related people.
export const AVATAR_EMOJI_GROUPS = [
  { label: 'Animal Faces', items: [
    { e: '🐶', n: 'dog puppy' }, { e: '🐱', n: 'cat kitten' },
    { e: '🐭', n: 'mouse' }, { e: '🐹', n: 'hamster' },
    { e: '🐰', n: 'rabbit bunny' }, { e: '🦊', n: 'fox' },
    { e: '🐻', n: 'bear' }, { e: '🐼', n: 'panda' },
    { e: '🐨', n: 'koala' }, { e: '🐯', n: 'tiger' },
    { e: '🦁', n: 'lion' }, { e: '🐮', n: 'cow' },
    { e: '🐷', n: 'pig' }, { e: '🐸', n: 'frog' },
    { e: '🐵', n: 'monkey' }, { e: '🙈', n: 'monkey see no evil' },
    { e: '🙉', n: 'monkey hear no evil' }, { e: '🙊', n: 'monkey speak no evil' },
    { e: '🐺', n: 'wolf' }, { e: '🐴', n: 'horse' },
    { e: '🦄', n: 'unicorn' }, { e: '🐔', n: 'chicken' },
    { e: '🐧', n: 'penguin' }, { e: '🦉', n: 'owl' },
  ]},
  { label: 'Fun & Fantasy', items: [
    { e: '👻', n: 'ghost' }, { e: '😈', n: 'devil purple horns' },
    { e: '👹', n: 'ogre' }, { e: '👺', n: 'goblin' },
    { e: '💀', n: 'skull' }, { e: '👽', n: 'alien' },
    { e: '👾', n: 'alien monster' }, { e: '🤖', n: 'robot' },
    { e: '🎃', n: 'pumpkin jack o lantern halloween' },
    { e: '🧟', n: 'zombie' }, { e: '🧛', n: 'vampire' },
    { e: '🧙', n: 'wizard mage' }, { e: '🧚', n: 'fairy' },
    { e: '🥷', n: 'ninja' }, { e: '🦸', n: 'superhero' },
    { e: '🦹', n: 'supervillain' }, { e: '🤡', n: 'clown' },
    { e: '🙃', n: 'upside down face' },
  ]},
  { label: 'Food People', items: [
    { e: '🧑‍🍳', n: 'chef cook' }, { e: '👨‍🍳', n: 'man chef cook' },
    { e: '👩‍🍳', n: 'woman chef cook' }, { e: '🧑‍🌾', n: 'farmer' },
    { e: '👨‍🌾', n: 'man farmer' }, { e: '👩‍🌾', n: 'woman farmer' },
  ]},
]

interface EmojiGroup {
  label: string
  items: { e: string; n: string }[]
}

interface Props {
  value: string | null
  onChange: (emoji: string) => void
  groups?: EmojiGroup[]
  fallback?: string
  searchPlaceholder?: string
}

export default function EmojiPicker({
  value, onChange,
  groups = EMOJI_GROUPS, fallback = '📦', searchPlaceholder = 'Search food emojis…',
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const q = search.toLowerCase().trim()

  const filteredGroups = useMemo(() => {
    if (!q) return groups
    return groups
      .map(g => ({ ...g, items: g.items.filter(item => item.n.includes(q)) }))
      .filter(g => g.items.length > 0)
  }, [q, groups])

  function handleSelect(emoji: string) {
    onChange(emoji)
    setOpen(false)
    setSearch('')
  }

  return (
    <Drawer open={open} onOpenChange={o => { setOpen(o); if (!o) setSearch('') }}>
      {/* Trigger — compact emoji box */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center shrink-0"
        style={{
          width: 32, height: 32,
          borderRadius: 8, fontSize: 16,
          background: 'var(--surface)',
          border: 'none', cursor: 'pointer',
        }}
        aria-label="Choose emoji"
      >
        {value ?? fallback}
      </button>

      <DrawerContent
        className="flex flex-col outline-none"
        style={{ background: 'oklch(97% 0.006 85)', border: 'none', maxHeight: '65vh' }}
      >
        {/* Header */}
        <DrawerHeader className="flex items-center justify-between gap-4 px-5 pt-2 pb-1 shrink-0">
          <DrawerTitle className="text-20 font-extrabold m-0" style={{ color: 'var(--foreground)' }}>
            Emoji
          </DrawerTitle>
          <button
            type="button"
            onClick={() => { setOpen(false); setSearch('') }}
            className="flex items-center justify-center rounded-full shrink-0"
            style={{ width: 36, height: 36, background: 'var(--surface)', border: 'none', cursor: 'pointer', color: 'var(--foreground)' }}
          >
            <i className="fi-rr-cross-small" style={{ fontSize: 16, display: 'block' }} />
          </button>
        </DrawerHeader>

        {/* Emoji grid — scrollable */}
        <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-2">
          {filteredGroups.length === 0 ? (
            <p className="text-sm text-center pt-5" style={{ color: 'var(--muted)' }}>
              No emojis found for &ldquo;{search}&rdquo;
            </p>
          ) : filteredGroups.map(group => (
            <div key={group.label} className="mb-5">
              <p className="text-11 font-extrabold uppercase tracking-003 mb-2" style={{ color: 'var(--muted)' }}>
                {group.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map(item => (
                  <button
                    key={item.e}
                    type="button"
                    onClick={() => handleSelect(item.e)}
                    className="flex items-center justify-center rounded-xl"
                    style={{
                      width: 44, height: 44, fontSize: 22,
                      cursor: 'pointer',
                      background: value === item.e ? 'var(--yellow-light)' : 'oklch(100% 0 0 / 0.5)',
                      border: value === item.e
                        ? '2px solid var(--yellow)'
                        : '1.5px solid var(--divider)',
                    }}
                    aria-label={item.n}
                  >
                    {item.e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Search — pinned bottom */}
        <div className="shrink-0 px-5 pt-2" style={{ borderTop: '1px solid var(--divider)', paddingBottom: 'calc(28px + env(safe-area-inset-bottom))' }}>
          <div className="relative">
            <i className="fi-rr-search" style={{
              position: 'absolute', left: 14, top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 16, display: 'block', lineHeight: 1, color: 'var(--muted)',
            }} />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoComplete="off"
              className="rounded-xl text-sm pl-10"
              style={{
                background: 'oklch(100% 0 0 / 0.6)',
                borderColor: 'oklch(100% 0 0 / 0.5)',
                color: 'var(--foreground)',
              }}
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
