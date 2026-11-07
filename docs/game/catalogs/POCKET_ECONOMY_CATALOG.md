# Merzkava Pocket — Integrated Economy, Items, Production & Facilities Catalogue

**Pocket baseline v1.0.0 · 1,000 items · 200 facilities · 20 recipes · 70 crop/seed pairs**

## Official currency and pricing
Only Universe currencies: xc, xs, xg, zj, az. Rates: 100 xc = 1 xs; 100 xs = 1 xg; 1,000 xg = 1 zj; 10 zj = 1 az. xv is not a currency.
Owner price anchors: 5 ordinary logs = 2 xc (0.4 xc/log, trade as 5-log lot); one Diamond Jade Ore = 700 xs (70,000 xc = 7 xg).
Final item value = (Base Trade-Lot Value × Tier × Condition × Effective Scarcity × Demand) + Distribution Adjustment + Local Market Adjustment. Apply Universe's single official pricing formula. Never double-count the same shortage. Bundle low-value units and settle in whole official coins.
Base trade-lot values account for time to extract, tool wear, usefulness, abundance and scarcity. Ordinary resources stay cheap; deep, rare, hazardous and vein-limited materials cost more. Diamond Jade Ore has a 700 xs baseline before market modifiers.

## Quantity per minute
Rates are per Pocket simulation minute of active work. Pocket time runs ×48; divide simulation timers by 48 once for real elapsed time. Passive crop growth is average yield per plot per simulation minute over a full growth cycle; harvesting is a separate active action.
- Woodcutting: matching tree node + axe + forest; 0.28–0.44 logs/min, per-tree harvest cap and respawn.
- Quarry: exposed deposit + pickaxe; common stone baseline 0.24 pieces/min; loose material uses shovel.
- Mining: discovered vein + pickaxe + mining lamp + Mine Shaft; item-specific rate, common baseline 0.16 ore/min, vein depletion.
- Foraging: matching habitat + basket/shears; typical 0.25 bundles/min; rare herbs and mushrooms slower.
- Farming: seed + hoe + dibber + water + Farm Plot; crop growth and yield/plot; mature harvest 5–9 units/min.
- Fishing: valid habitat + rod/net + bait where needed; expected 0.18 kg/min baseline; stochastic catch.
- Hunting: habitat + weapon + tracking; encounter/loot rates are averages, not guarantees.
- Husbandry: average output/min over collection cycles; species, facility, feed, water and care required.
- Processing: batch yield ÷ active recipe minutes; exact inputs, facility and station tool. Commit input/output atomically on completion.

## Facility construction cost formula
Total economic build cost = materials subtotal + construction labour fee + site/permit fee + specialist/equipment fee.
Materials subtotal = sum(quantity × current local unit price). Labour = builders × active construction sim-minutes × 0.02 xc per builder-sim-minute × complexity factor × site-access factor. Site/permit fee is folded into the recorded cash fee. Specialist/equipment charges apply when the facility lists specialist work/apparatus.
Complexity: simple 1.0; ordinary 1.25; demanding 1.6; specialist 2.2; high-precision/Arcanistry 3.0+. Site: prepared village plot 1.0; remote 1.2; difficult mountain/wetland 1.6; hazardous/isolated 2.0+. Cash fee excludes material bill; purchase materials separately. Material scarcity changes their current local market price under Universe's pricing formula, without an extra second surcharge.

## Build time and Requirements
Construction and upgrades are Pocket simulation minutes; ÷48 once for real elapsed time. Adjusted time = base structural work × complexity × site difficulty ÷ effective builder count. Each facility defines site/land access, cash fee, material quantities, builder tools/workforce/skill, predecessor, build duration, L1–L3 capacities, L2/L3 fee/material/time, operating tools/staff/inputs and outputs. Missing Requirements block construction; timer does not start.

## Integrated loops
Timber: forest tree → axe → log/min → Woodcutter's Yard → Sawmill L1 (2 Pine Logs + Wood Saw, 4 sim-min → 3 Rough Planks = 0.75 plank/min) → carpentry, storage, wells, coops, bridges and furniture.
Water/farming: source → Village Well/bucket → Farm Plot L1 → packet of 5 seeds → one seed/plot → crop growth + water/care → mature harvest → food, flour, oil, feed, preserves or seed saving.
Fish: correct water body + rod/net → probabilistic catch → fresh sale or smoke/dry/pickle process. Fish Pond/Hatchery needs compatible freshwater stock, feed and clean water.
Mine/tool: ore vein → pickaxe + lamp + Mine Shaft → ore/min → Smelter + charcoal → ingot → Smithy + anvil/hammer/tongs → tools and repairs.

## Accounting
No output without correct location/node, tool, access, inputs, capacity, recipe and operational facility. Nodes deplete and respawn. Facilities cannot create raw resources. Record inventory and Wallet movements in Pocket ledgers. Commit every process once. Unconfigured costs/yields remain unavailable.

## Data files
- POCKET_ECONOMY_ITEMS_001_500.json
- POCKET_ECONOMY_ITEMS_501_1000.json
- POCKET_FACILITIES_200.json
- POCKET_PRODUCTION_RECIPES.json

## Complete item listing (1,000)
itm.0001 | Stone Hatchet | tool | base 8 xc
itm.0002 | Bronze Hatchet | tool | base 10 xc
itm.0003 | Iron Axe | tool | base 12 xc
itm.0004 | Steel Axe | tool | base 14 xc
itm.0005 | Stone Pickaxe | tool | base 16 xc
itm.0006 | Bronze Pickaxe | tool | base 18 xc
itm.0007 | Iron Pickaxe | tool | base 20 xc
itm.0008 | Steel Pickaxe | tool | base 22 xc
itm.0009 | Wooden Shovel | tool | base 24 xc
itm.0010 | Iron Shovel | tool | base 26 xc
itm.0011 | Steel Shovel | tool | base 28 xc
itm.0012 | Wooden Hoe | tool | base 30 xc
itm.0013 | Bronze Hoe | tool | base 32 xc
itm.0014 | Iron Hoe | tool | base 8 xc
itm.0015 | Bronze Sickle | tool | base 10 xc
itm.0016 | Iron Sickle | tool | base 12 xc
itm.0017 | Grain Scythe | tool | base 14 xc
itm.0018 | Pruning Shears | tool | base 16 xc
itm.0019 | Gathering Basket | tool | base 18 xc
itm.0020 | Large Foraging Basket | tool | base 20 xc
itm.0021 | Herb Shears | tool | base 22 xc
itm.0022 | Fishing Rod | tool | base 24 xc
itm.0023 | Reinforced Fishing Rod | tool | base 26 xc
itm.0024 | Fishing Net | tool | base 28 xc
itm.0025 | Cast Net | tool | base 30 xc
itm.0026 | Fishing Spear | tool | base 32 xc
itm.0027 | Fishing Trap | tool | base 8 xc
itm.0028 | Crab Pot | tool | base 10 xc
itm.0029 | Hunting Knife | tool | base 12 xc
itm.0030 | Skinning Knife | tool | base 14 xc
itm.0031 | Hunting Bow | tool | base 16 xc
itm.0032 | Wooden Spear | tool | base 18 xc
itm.0033 | Iron Spear | tool | base 20 xc
itm.0034 | Crossbow | tool | base 22 xc
itm.0035 | Arrow Bundle | tool | base 24 xc
itm.0036 | Wood Saw | tool | base 26 xc
itm.0037 | Iron Hand Saw | tool | base 28 xc
itm.0038 | Stone Chisel | tool | base 30 xc
itm.0039 | Iron Chisel | tool | base 32 xc
itm.0040 | Hammer | tool | base 8 xc
itm.0041 | Mason's Mallet | tool | base 10 xc
itm.0042 | Trowel | tool | base 12 xc
itm.0043 | Brick Trowel | tool | base 14 xc
itm.0044 | Mason's Chisel | tool | base 16 xc
itm.0045 | Watering Can | tool | base 18 xc
itm.0046 | Wooden Bucket | tool | base 20 xc
itm.0047 | Iron Bucket | tool | base 22 xc
itm.0048 | Rope Coil | tool | base 24 xc
itm.0049 | Oil Lantern | tool | base 26 xc
itm.0050 | Torch Bundle | tool | base 28 xc
itm.0051 | Flint and Steel | tool | base 30 xc
itm.0052 | Mortar and Pestle | tool | base 32 xc
itm.0053 | Seed Dibber | tool | base 8 xc
itm.0054 | Hand Plow | tool | base 10 xc
itm.0055 | Animal Feed Scoop | tool | base 12 xc
itm.0056 | Milk Pail | tool | base 14 xc
itm.0057 | Egg Basket | tool | base 16 xc
itm.0058 | Bee Smoker | tool | base 18 xc
itm.0059 | Bee Veil | tool | base 20 xc
itm.0060 | Silkworm Feeding Tray | tool | base 22 xc
itm.0061 | Butter Churn | tool | base 24 xc
itm.0062 | Cheese Press | tool | base 26 xc
itm.0063 | Meat Cleaver | tool | base 28 xc
itm.0064 | Butcher Hook | tool | base 30 xc
itm.0065 | Forge Tongs | tool | base 32 xc
itm.0066 | Blacksmith Hammer | tool | base 8 xc
itm.0067 | Anvil | tool | base 10 xc
itm.0068 | Forge Bellows | tool | base 12 xc
itm.0069 | Glassblower Pipe | tool | base 14 xc
itm.0070 | Papermaking Screen | tool | base 16 xc
itm.0071 | Ink Brush Set | tool | base 18 xc
itm.0072 | Rice Thresher | tool | base 20 xc
itm.0073 | Grain Winnower | tool | base 22 xc
itm.0074 | Small Water Pump | tool | base 24 xc
itm.0075 | Irrigation Spade | tool | base 26 xc
itm.0076 | Ore Sieve | tool | base 28 xc
itm.0077 | Mining Lamp | tool | base 30 xc
itm.0078 | Quarry Wedge Set | tool | base 32 xc
itm.0079 | Wheelbarrow | tool | base 8 xc
itm.0080 | Handcart | tool | base 10 xc
itm.0081 | Pine Log | raw | base 0.4 xc
itm.0082 | Cedar Log | raw | base 0.6 xc
itm.0083 | Fir Log | raw | base 0.45 xc
itm.0084 | Oak Log | raw | base 0.8 xc
itm.0085 | Birch Log | raw | base 0.4 xc
itm.0086 | Maple Log | raw | base 0.7 xc
itm.0087 | Ash Log | raw | base 0.6 xc
itm.0088 | Elm Log | raw | base 0.6 xc
itm.0089 | Willow Log | raw | base 0.35 xc
itm.0090 | Alder Log | raw | base 0.45 xc
itm.0091 | Camphor Log | raw | base 2 xc
itm.0092 | Sandalwood Log | raw | base 8 xc
itm.0093 | Blackwood Log | raw | base 5 xc
itm.0094 | Ironwood Log | raw | base 4 xc
itm.0095 | Redwood Log | raw | base 6 xc
itm.0096 | Bamboo Log | raw | base 0.25 xc
itm.0097 | Chestnut Log | raw | base 0.7 xc
itm.0098 | Mulberry Log | raw | base 0.55 xc
itm.0099 | Cypress Log | raw | base 0.9 xc
itm.0100 | Poplar Log | raw | base 0.4 xc
itm.0101 | Beech Log | raw | base 0.8 xc
itm.0102 | Walnut Log | raw | base 1.4 xc
itm.0103 | Cherry Log | raw | base 1.2 xc
itm.0104 | Larch Log | raw | base 0.6 xc
itm.0105 | Yew Log | raw | base 5 xc
itm.0106 | Fallen Timber | raw | base 2 xc
itm.0107 | Dry Branch Bundle | raw | base 4 xc
itm.0108 | Tree Bark | raw | base 6 xc
itm.0109 | Pine Resin | raw | base 8 xc
itm.0110 | Maple Sap | raw | base 10 xc
itm.0111 | Bamboo Shoot | raw | base 12 xc
itm.0112 | Wood Chips | raw | base 14 xc
itm.0113 | Sawdust | raw | base 16 xc
itm.0114 | Wood Ash | raw | base 18 xc
itm.0115 | Charcoal | raw | base 20 xc
itm.0116 | Firewood Bundle | raw | base 22 xc
itm.0117 | Rattan Cane | raw | base 24 xc
itm.0118 | Wild Vine | raw | base 26 xc
itm.0119 | Coconut Husk | raw | base 2 xc
itm.0120 | Coconut Shell | raw | base 4 xc
itm.0121 | Palm Frond | raw | base 6 xc
itm.0122 | Cork Bark | raw | base 8 xc
itm.0123 | Cedar Resin | raw | base 10 xc
itm.0124 | Sandalwood Shavings | raw | base 12 xc
itm.0125 | Bamboo Pole | raw | base 14 xc
itm.0126 | Wooden Sapling | raw | base 16 xc
itm.0127 | Tree Seed Cones | raw | base 18 xc
itm.0128 | Mulch | raw | base 20 xc
itm.0129 | Wooden Peg Stock | raw | base 22 xc
itm.0130 | Coppice Shoot | raw | base 24 xc
itm.0131 | River Pebble | raw | base 1 xc
itm.0132 | Fieldstone | raw | base 3 xc
itm.0133 | Granite Chunk | raw | base 5 xc
itm.0134 | Granite Block | raw | base 7 xc
itm.0135 | Limestone | raw | base 9 xc
itm.0136 | Limestone Block | raw | base 11 xc
itm.0137 | Sandstone | raw | base 13 xc
itm.0138 | Sandstone Block | raw | base 15 xc
itm.0139 | Slate | raw | base 17 xc
itm.0140 | Slate Slab | raw | base 19 xc
itm.0141 | Marble | raw | base 21 xc
itm.0142 | Marble Slab | raw | base 23 xc
itm.0143 | Flint Nodule | raw | base 25 xc
itm.0144 | Quartz Chunk | raw | base 1 xc
itm.0145 | Clear Quartz | raw | base 3 xc
itm.0146 | Clay Lump | raw | base 5 xc
itm.0147 | Fine Clay | raw | base 7 xc
itm.0148 | Red Clay | raw | base 9 xc
itm.0149 | White Clay | raw | base 11 xc
itm.0150 | Kaolin | raw | base 13 xc
itm.0151 | River Sand | raw | base 15 xc
itm.0152 | Sea Sand | raw | base 17 xc
itm.0153 | Gravel | raw | base 19 xc
itm.0154 | Limestone Gravel | raw | base 21 xc
itm.0155 | Chalk | raw | base 23 xc
itm.0156 | Basalt | raw | base 25 xc
itm.0157 | Pumice Stone | raw | base 1 xc
itm.0158 | Obsidian Shard | raw | base 3 xc
itm.0159 | Shale | raw | base 5 xc
itm.0160 | Gypsum Rock | raw | base 7 xc
itm.0161 | Mica Sheet | raw | base 9 xc
itm.0162 | Salt Rock | raw | base 11 xc
itm.0163 | Volcanic Ash | raw | base 13 xc
itm.0164 | Crushed Seashell | raw | base 15 xc
itm.0165 | Coral Fragment | raw | base 17 xc
itm.0166 | Pearl Oyster Shell | raw | base 19 xc
itm.0167 | Peat Block | raw | base 21 xc
itm.0168 | Topsoil Sack | raw | base 23 xc
itm.0169 | Fertile Loam Sack | raw | base 25 xc
itm.0170 | Iron-Rich Sand | raw | base 1 xc
itm.0171 | Iron Ore | raw | base 8 xc
itm.0172 | Copper Ore | raw | base 10 xc
itm.0173 | Tin Ore | raw | base 12 xc
itm.0174 | Silver Ore | raw | base 14 xc
itm.0175 | Gold Ore | raw | base 16 xc
itm.0176 | Coal Chunk | raw | base 18 xc
itm.0177 | Sulfur Lump | raw | base 20 xc
itm.0178 | Hematite Ore | raw | base 22 xc
itm.0179 | Malachite Ore | raw | base 24 xc
itm.0180 | Cinnabar Ore | raw | base 26 xc
itm.0181 | Lead Ore | raw | base 28 xc
itm.0182 | Zinc Ore | raw | base 30 xc
itm.0183 | Nickel Ore | raw | base 32 xc
itm.0184 | Cobalt Ore | raw | base 8 xc
itm.0185 | Graphite Lump | raw | base 10 xc
itm.0186 | Salt Crystal | raw | base 12 xc
itm.0187 | Fluorite | raw | base 14 xc
itm.0188 | Garnet | raw | base 16 xc
itm.0189 | Jade Roughstone | raw | base 18 xc
itm.0190 | Agate Nodule | raw | base 20 xc
itm.0191 | Amethyst | raw | base 22 xc
itm.0192 | Topaz | raw | base 24 xc
itm.0193 | Aquamarine | raw | base 26 xc
itm.0194 | Tourmaline | raw | base 28 xc
itm.0195 | Moonstone | raw | base 30 xc
itm.0196 | Lapis Lazuli | raw | base 32 xc
itm.0197 | Pyrite | raw | base 8 xc
itm.0198 | Manganese Ore | raw | base 10 xc
itm.0199 | Chromite Ore | raw | base 12 xc
itm.0200 | Tungsten Ore | raw | base 14 xc
itm.0201 | Antimony Ore | raw | base 16 xc
itm.0202 | Bauxite Ore | raw | base 18 xc
itm.0203 | Phosphate Rock | raw | base 20 xc
itm.0204 | Niter | raw | base 22 xc
itm.0205 | Realgar | raw | base 24 xc
itm.0206 | Orpiment | raw | base 26 xc
itm.0207 | Meteoric Iron Fragment | raw | base 28 xc
itm.0208 | Ancient Copper Vein Ore | raw | base 30 xc
itm.0209 | Blue Crystal Geode | raw | base 32 xc
itm.0210 | Diamond Jade Ore | raw | base 70000 xc
itm.0211 | Wild Reed | forage | base 2 xc
itm.0212 | Hemp Fiber | forage | base 4 xc
itm.0213 | Flax Stalk | forage | base 6 xc
itm.0214 | Jute Fiber | forage | base 8 xc
itm.0215 | Cotton Boll | forage | base 10 xc
itm.0216 | Mulberry Leaf | forage | base 12 xc
itm.0217 | Bamboo Fiber | forage | base 14 xc
itm.0218 | Dry Grass Bundle | forage | base 16 xc
itm.0219 | Thatch Reed | forage | base 18 xc
itm.0220 | Wild Nettle Fiber | forage | base 20 xc
itm.0221 | Agave Fiber | forage | base 22 xc
itm.0222 | Sisal Fiber | forage | base 24 xc
itm.0223 | Coconut Coir | forage | base 26 xc
itm.0224 | Silkworm Cocoon | forage | base 2 xc
itm.0225 | Silkworm Egg Cluster | forage | base 4 xc
itm.0226 | Bee Wax Lump | forage | base 6 xc
itm.0227 | Wild Honeycomb | forage | base 8 xc
itm.0228 | Moss Bundle | forage | base 10 xc
itm.0229 | Medicinal Tree Gum | forage | base 12 xc
itm.0230 | Wild Mushroom | forage | base 14 xc
itm.0231 | Oyster Mushroom | forage | base 16 xc
itm.0232 | Shiitake Mushroom | forage | base 18 xc
itm.0233 | Wood Ear Mushroom | forage | base 20 xc
itm.0234 | Morel Mushroom | forage | base 22 xc
itm.0235 | Truffle | forage | base 24 xc
itm.0236 | Chanterelle | forage | base 26 xc
itm.0237 | Enoki Cluster | forage | base 2 xc
itm.0238 | Puffball Mushroom | forage | base 4 xc
itm.0239 | Reishi Mushroom | forage | base 6 xc
itm.0240 | Lion's Mane Mushroom | forage | base 8 xc
itm.0241 | Wild Ginger | forage | base 10 xc
itm.0242 | Wild Turmeric | forage | base 12 xc
itm.0243 | Wild Garlic | forage | base 14 xc
itm.0244 | Wild Onion | forage | base 16 xc
itm.0245 | Edible Fern Shoots | forage | base 18 xc
itm.0246 | Nettle Leaves | forage | base 20 xc
itm.0247 | Wild Mint | forage | base 22 xc
itm.0248 | Lemongrass | forage | base 24 xc
itm.0249 | Wild Berries | forage | base 26 xc
itm.0250 | Wild Plum | forage | base 2 xc
itm.0251 | Acorn | forage | base 4 xc
itm.0252 | Chestnut | forage | base 6 xc
itm.0253 | Rose Hip | forage | base 8 xc
itm.0254 | Hawthorn Berry | forage | base 10 xc
itm.0255 | Wild Apple | forage | base 12 xc
itm.0256 | Wild Pear | forage | base 14 xc
itm.0257 | Burdock Root | forage | base 16 xc
itm.0258 | Dandelion Greens | forage | base 18 xc
itm.0259 | Wild Purslane | forage | base 20 xc
itm.0260 | Watercress | forage | base 22 xc
itm.0261 | Lotus Root | forage | base 24 xc
itm.0262 | Lotus Seed Pod | forage | base 26 xc
itm.0263 | Arrowroot | forage | base 2 xc
itm.0264 | Taro Leaf | forage | base 4 xc
itm.0265 | Wild Chili | forage | base 6 xc
itm.0266 | Juniper Berry | forage | base 8 xc
itm.0267 | Elderberry | forage | base 10 xc
itm.0268 | Saffron Crocus | forage | base 12 xc
itm.0269 | Vanilla Pod | forage | base 14 xc
itm.0270 | Wild Tea Leaf | forage | base 16 xc
itm.0271 | Sea Buckthorn | forage | base 18 xc
itm.0272 | Mugwort | forage | base 20 xc
itm.0273 | Perilla Leaf | forage | base 22 xc
itm.0274 | Schisandra Berry | forage | base 24 xc
itm.0275 | Goji Berry | forage | base 26 xc
itm.0276 | Chrysanthemum Flower | forage | base 2 xc
itm.0277 | Hibiscus Flower | forage | base 4 xc
itm.0278 | Jasmine Flower | forage | base 6 xc
itm.0279 | Osmanthus Flower | forage | base 8 xc
itm.0280 | Lotus Petal | forage | base 10 xc
itm.0281 | Orchid Root | forage | base 12 xc
itm.0282 | Fern Spores | forage | base 14 xc
itm.0283 | Sage Leaf | forage | base 16 xc
itm.0284 | Rosemary Sprig | forage | base 18 xc
itm.0285 | Thyme Sprig | forage | base 20 xc
itm.0286 | Oregano Bundle | forage | base 22 xc
itm.0287 | Dried Seaweed | forage | base 24 xc
itm.0288 | Poppy Seed Pod | forage | base 26 xc
itm.0289 | Mandrake Root | forage | base 2 xc
itm.0290 | Moonflower Petal | forage | base 4 xc
itm.0291 | Sunstone Moss | forage | base 6 xc
itm.0292 | Frostmint | forage | base 8 xc
itm.0293 | Emberleaf | forage | base 10 xc
itm.0294 | Cloudroot | forage | base 12 xc
itm.0295 | Thundergrass | forage | base 14 xc
itm.0296 | Silverdew Flower | forage | base 16 xc
itm.0297 | Pandan Leaf | forage | base 18 xc
itm.0298 | Wild Coffee Cherry | forage | base 20 xc
itm.0299 | Wild Cacao Pod | forage | base 22 xc
itm.0300 | Wild Olive | forage | base 24 xc
itm.0301 | Wild Fig | forage | base 26 xc
itm.0302 | Wild Pomegranate | forage | base 2 xc
itm.0303 | Desert Date | forage | base 4 xc
itm.0304 | Cloudberry | forage | base 6 xc
itm.0305 | Frost Berry | forage | base 8 xc
itm.0306 | Ember Mushroom | forage | base 10 xc
itm.0307 | Thunder Lichen | forage | base 12 xc
itm.0308 | Cattail Root | forage | base 14 xc
itm.0309 | Cattail Fluff | forage | base 16 xc
itm.0310 | Wild Yam | forage | base 18 xc
itm.0311 | Snow Herb | herb | base 5 xc
itm.0312 | Spirit Calm Leaf | herb | base 7 xc
itm.0313 | Bitterroot | herb | base 9 xc
itm.0314 | Goldthread Root | herb | base 11 xc
itm.0315 | Ginseng Root | herb | base 13 xc
itm.0316 | Wild Angelica | herb | base 15 xc
itm.0317 | Licorice Root | herb | base 17 xc
itm.0318 | Astragalus Root | herb | base 19 xc
itm.0319 | Peony Root | herb | base 21 xc
itm.0320 | Fleeceflower Root | herb | base 23 xc
itm.0321 | Mint Leaf | herb | base 25 xc
itm.0322 | Chamomile Flower | herb | base 27 xc
itm.0323 | Lavender Bundle | herb | base 29 xc
itm.0324 | Yarrow | herb | base 5 xc
itm.0325 | Plantain Leaf | herb | base 7 xc
itm.0326 | Comfrey Root | herb | base 9 xc
itm.0327 | Calendula Flower | herb | base 11 xc
itm.0328 | Feverfew | herb | base 13 xc
itm.0329 | Valerian Root | herb | base 15 xc
itm.0330 | St John's Wort | herb | base 17 xc
itm.0331 | White Willow Bark | herb | base 19 xc
itm.0332 | Echinacea Root | herb | base 21 xc
itm.0333 | Burdock Seed | herb | base 23 xc
itm.0334 | Dried Kelp Herb | herb | base 25 xc
itm.0335 | Mugwort Leaf | herb | base 27 xc
itm.0336 | Perilla Leaf (herb) | herb | base 29 xc
itm.0337 | Schisandra Berry (herb) | herb | base 5 xc
itm.0338 | Goji Berry (herb) | herb | base 7 xc
itm.0339 | Chrysanthemum Flower (herb) | herb | base 9 xc
itm.0340 | Hibiscus Flower (herb) | herb | base 11 xc
itm.0341 | Jasmine Flower (herb) | herb | base 13 xc
itm.0342 | Osmanthus Flower (herb) | herb | base 15 xc
itm.0343 | Lotus Petal (herb) | herb | base 17 xc
itm.0344 | Orchid Root (herb) | herb | base 19 xc
itm.0345 | Sage Leaf (herb) | herb | base 21 xc
itm.0346 | Rosemary Sprig (herb) | herb | base 23 xc
itm.0347 | Thyme Sprig (herb) | herb | base 25 xc
itm.0348 | Frostmint (herb) | herb | base 27 xc
itm.0349 | Emberleaf (herb) | herb | base 29 xc
itm.0350 | Cloudroot (herb) | herb | base 5 xc
itm.0351 | Rice Seeds | seed | base 2 xc
itm.0352 | Rice | crop | base 3 xc
itm.0353 | Wheat Seeds | seed | base 4 xc
itm.0354 | Wheat | crop | base 6 xc
itm.0355 | Barley Seeds | seed | base 6 xc
itm.0356 | Barley | crop | base 9 xc
itm.0357 | Oat Seeds | seed | base 8 xc
itm.0358 | Oat | crop | base 12 xc
itm.0359 | Millet Seeds | seed | base 10 xc
itm.0360 | Millet | crop | base 15 xc
itm.0361 | Corn Seeds | seed | base 12 xc
itm.0362 | Corn | crop | base 18 xc
itm.0363 | Sorghum Seeds | seed | base 14 xc
itm.0364 | Sorghum | crop | base 21 xc
itm.0365 | Buckwheat Seeds | seed | base 16 xc
itm.0366 | Buckwheat | crop | base 24 xc
itm.0367 | Soybean Seeds | seed | base 18 xc
itm.0368 | Soybean | crop | base 27 xc
itm.0369 | Mung Bean Seeds | seed | base 2 xc
itm.0370 | Mung Bean | crop | base 3 xc
itm.0371 | Red Bean Seeds | seed | base 4 xc
itm.0372 | Red Bean | crop | base 6 xc
itm.0373 | Black Bean Seeds | seed | base 6 xc
itm.0374 | Black Bean | crop | base 9 xc
itm.0375 | Peanut Seeds | seed | base 8 xc
itm.0376 | Peanut | crop | base 12 xc
itm.0377 | Sesame Seeds | seed | base 10 xc
itm.0378 | Sesame | crop | base 15 xc
itm.0379 | Sunflower Seeds | seed | base 12 xc
itm.0380 | Sunflower | crop | base 18 xc
itm.0381 | Potato Seeds | seed | base 14 xc
itm.0382 | Potato | crop | base 21 xc
itm.0383 | Sweet Potato Seeds | seed | base 16 xc
itm.0384 | Sweet Potato | crop | base 24 xc
itm.0385 | Taro Seeds | seed | base 18 xc
itm.0386 | Taro | crop | base 27 xc
itm.0387 | Cassava Seeds | seed | base 2 xc
itm.0388 | Cassava | crop | base 3 xc
itm.0389 | Yam Seeds | seed | base 4 xc
itm.0390 | Yam | crop | base 6 xc
itm.0391 | Carrot Seeds | seed | base 6 xc
itm.0392 | Carrot | crop | base 9 xc
itm.0393 | Radish Seeds | seed | base 8 xc
itm.0394 | Radish | crop | base 12 xc
itm.0395 | Daikon Seeds | seed | base 10 xc
itm.0396 | Daikon | crop | base 15 xc
itm.0397 | Turnip Seeds | seed | base 12 xc
itm.0398 | Turnip | crop | base 18 xc
itm.0399 | Beetroot Seeds | seed | base 14 xc
itm.0400 | Beetroot | crop | base 21 xc
itm.0401 | Cabbage Seeds | seed | base 16 xc
itm.0402 | Cabbage | crop | base 24 xc
itm.0403 | Chinese Cabbage Seeds | seed | base 18 xc
itm.0404 | Chinese Cabbage | crop | base 27 xc
itm.0405 | Lettuce Seeds | seed | base 2 xc
itm.0406 | Lettuce | crop | base 3 xc
itm.0407 | Spinach Seeds | seed | base 4 xc
itm.0408 | Spinach | crop | base 6 xc
itm.0409 | Kale Seeds | seed | base 6 xc
itm.0410 | Kale | crop | base 9 xc
itm.0411 | Mustard Greens Seeds | seed | base 8 xc
itm.0412 | Mustard Greens | crop | base 12 xc
itm.0413 | Water Spinach Seeds | seed | base 10 xc
itm.0414 | Water Spinach | crop | base 15 xc
itm.0415 | Bok Choy Seeds | seed | base 12 xc
itm.0416 | Bok Choy | crop | base 18 xc
itm.0417 | Celery Seeds | seed | base 14 xc
itm.0418 | Celery | crop | base 21 xc
itm.0419 | Leek Seeds | seed | base 16 xc
itm.0420 | Leek | crop | base 24 xc
itm.0421 | Onion Seeds | seed | base 18 xc
itm.0422 | Onion | crop | base 27 xc
itm.0423 | Garlic Seeds | seed | base 2 xc
itm.0424 | Garlic | crop | base 3 xc
itm.0425 | Shallot Seeds | seed | base 4 xc
itm.0426 | Shallot | crop | base 6 xc
itm.0427 | Ginger Seeds | seed | base 6 xc
itm.0428 | Ginger | crop | base 9 xc
itm.0429 | Turmeric Seeds | seed | base 8 xc
itm.0430 | Turmeric | crop | base 12 xc
itm.0431 | Chili Pepper Seeds | seed | base 10 xc
itm.0432 | Chili Pepper | crop | base 15 xc
itm.0433 | Bell Pepper Seeds | seed | base 12 xc
itm.0434 | Bell Pepper | crop | base 18 xc
itm.0435 | Tomato Seeds | seed | base 14 xc
itm.0436 | Tomato | crop | base 21 xc
itm.0437 | Eggplant Seeds | seed | base 16 xc
itm.0438 | Eggplant | crop | base 24 xc
itm.0439 | Cucumber Seeds | seed | base 18 xc
itm.0440 | Cucumber | crop | base 27 xc
itm.0441 | Pumpkin Seeds | seed | base 2 xc
itm.0442 | Pumpkin | crop | base 3 xc
itm.0443 | Bottle Gourd Seeds | seed | base 4 xc
itm.0444 | Bottle Gourd | crop | base 6 xc
itm.0445 | Bitter Melon Seeds | seed | base 6 xc
itm.0446 | Bitter Melon | crop | base 9 xc
itm.0447 | Okra Seeds | seed | base 8 xc
itm.0448 | Okra | crop | base 12 xc
itm.0449 | Green Bean Seeds | seed | base 10 xc
itm.0450 | Green Bean | crop | base 15 xc
itm.0451 | Pea Seeds | seed | base 12 xc
itm.0452 | Pea | crop | base 18 xc
itm.0453 | Long Bean Seeds | seed | base 14 xc
itm.0454 | Long Bean | crop | base 21 xc
itm.0455 | Broccoli Seeds | seed | base 16 xc
itm.0456 | Broccoli | crop | base 24 xc
itm.0457 | Cauliflower Seeds | seed | base 18 xc
itm.0458 | Cauliflower | crop | base 27 xc
itm.0459 | Zucchini Seeds | seed | base 2 xc
itm.0460 | Zucchini | crop | base 3 xc
itm.0461 | Watermelon Seeds | seed | base 4 xc
itm.0462 | Watermelon | crop | base 6 xc
itm.0463 | Melon Seeds | seed | base 6 xc
itm.0464 | Melon | crop | base 9 xc
itm.0465 | Cantaloupe Seeds | seed | base 8 xc
itm.0466 | Cantaloupe | crop | base 12 xc
itm.0467 | Strawberry Seeds | seed | base 10 xc
itm.0468 | Strawberry | crop | base 15 xc
itm.0469 | Blueberry Seeds | seed | base 12 xc
itm.0470 | Blueberry | crop | base 18 xc
itm.0471 | Raspberry Seeds | seed | base 14 xc
itm.0472 | Raspberry | crop | base 21 xc
itm.0473 | Blackberry Seeds | seed | base 16 xc
itm.0474 | Blackberry | crop | base 24 xc
itm.0475 | Grape Seeds | seed | base 18 xc
itm.0476 | Grape | crop | base 27 xc
itm.0477 | Mulberry Seeds | seed | base 2 xc
itm.0478 | Mulberry | crop | base 3 xc
itm.0479 | Pineapple Seeds | seed | base 4 xc
itm.0480 | Pineapple | crop | base 6 xc
itm.0481 | Banana Seeds | seed | base 6 xc
itm.0482 | Banana | crop | base 9 xc
itm.0483 | Papaya Seeds | seed | base 8 xc
itm.0484 | Papaya | crop | base 12 xc
itm.0485 | Mango Seeds | seed | base 10 xc
itm.0486 | Mango | crop | base 15 xc
itm.0487 | Guava Seeds | seed | base 12 xc
itm.0488 | Guava | crop | base 18 xc
itm.0489 | Lime Seeds | seed | base 14 xc
itm.0490 | Lime | crop | base 21 xc
itm.0491 | River Carp | fish | base 3 xc
itm.0492 | Silver Carp | fish | base 5 xc
itm.0493 | Grass Carp | fish | base 7 xc
itm.0494 | Crucian Carp | fish | base 9 xc
itm.0495 | Catfish | fish | base 11 xc
itm.0496 | Walking Catfish | fish | base 13 xc
itm.0497 | Snakehead Fish | fish | base 15 xc
itm.0498 | Tilapia | fish | base 17 xc
itm.0499 | River Perch | fish | base 19 xc
itm.0500 | Trout | fish | base 21 xc
itm.0501 | Freshwater Eel | fish | base 23 xc
itm.0502 | Mudfish | fish | base 25 xc
itm.0503 | Pangasius | fish | base 27 xc
itm.0504 | Rohu | fish | base 3 xc
itm.0505 | Mahseer | fish | base 5 xc
itm.0506 | Golden Mahseer | fish | base 7 xc
itm.0507 | Pond Loach | fish | base 9 xc
itm.0508 | Whitefish | fish | base 11 xc
itm.0509 | Bream | fish | base 13 xc
itm.0510 | Pike | fish | base 15 xc
itm.0511 | Bluegill | fish | base 17 xc
itm.0512 | Redfin | fish | base 19 xc
itm.0513 | River Prawn | fish | base 21 xc
itm.0514 | Freshwater Shrimp | fish | base 23 xc
itm.0515 | Crayfish | fish | base 25 xc
itm.0516 | Sea Bream | fish | base 27 xc
itm.0517 | Mackerel | fish | base 3 xc
itm.0518 | Sardine | fish | base 5 xc
itm.0519 | Anchovy | fish | base 7 xc
itm.0520 | Tuna | fish | base 9 xc
itm.0521 | Yellowfin Tuna | fish | base 11 xc
itm.0522 | Bonito | fish | base 13 xc
itm.0523 | Sea Bass | fish | base 15 xc
itm.0524 | Red Snapper | fish | base 17 xc
itm.0525 | Grouper | fish | base 19 xc
itm.0526 | Pomfret | fish | base 21 xc
itm.0527 | Ribbonfish | fish | base 23 xc
itm.0528 | Herring | fish | base 25 xc
itm.0529 | Cod | fish | base 27 xc
itm.0530 | Salmon | fish | base 3 xc
itm.0531 | Haddock | fish | base 5 xc
itm.0532 | Flounder | fish | base 7 xc
itm.0533 | Sole | fish | base 9 xc
itm.0534 | Halibut | fish | base 11 xc
itm.0535 | Swordfish | fish | base 13 xc
itm.0536 | Squid | fish | base 15 xc
itm.0537 | Cuttlefish | fish | base 17 xc
itm.0538 | Octopus | fish | base 19 xc
itm.0539 | Sea Urchin | fish | base 21 xc
itm.0540 | Green Mussel | fish | base 23 xc
itm.0541 | Oyster | fish | base 25 xc
itm.0542 | Scallop | fish | base 27 xc
itm.0543 | Clam | fish | base 3 xc
itm.0544 | Cockle | fish | base 5 xc
itm.0545 | Abalone | fish | base 7 xc
itm.0546 | Sea Cucumber | fish | base 9 xc
itm.0547 | Lobster | fish | base 11 xc
itm.0548 | Blue Crab | fish | base 13 xc
itm.0549 | Mud Crab | fish | base 15 xc
itm.0550 | King Crab | fish | base 17 xc
itm.0551 | Pheasant | raw | base 8 xc
itm.0552 | Wild Boar | raw | base 10 xc
itm.0553 | Mountain Deer | raw | base 12 xc
itm.0554 | Hare | raw | base 14 xc
itm.0555 | Wild Duck | raw | base 16 xc
itm.0556 | Wild Goose | raw | base 18 xc
itm.0557 | Forest Turkey | raw | base 20 xc
itm.0558 | Mountain Goat | raw | base 22 xc
itm.0559 | Musk Deer | raw | base 24 xc
itm.0560 | River Otter | raw | base 26 xc
itm.0561 | Fox Pelt | raw | base 28 xc
itm.0562 | Wolf Pelt | raw | base 30 xc
itm.0563 | Wildcat Pelt | raw | base 32 xc
itm.0564 | Boar Hide | raw | base 8 xc
itm.0565 | Deer Hide | raw | base 10 xc
itm.0566 | Antler Pair | raw | base 12 xc
itm.0567 | Feathered Quill Set | raw | base 14 xc
itm.0568 | Game Bird Meat | raw | base 16 xc
itm.0569 | Venison | raw | base 18 xc
itm.0570 | Wild Boar Meat | raw | base 20 xc
itm.0571 | Rabbit Pelt | raw | base 22 xc
itm.0572 | Rabbit Meat | raw | base 24 xc
itm.0573 | Deer Tendon | raw | base 26 xc
itm.0574 | Boar Tusk | raw | base 28 xc
itm.0575 | Sinew Cord Stock | raw | base 30 xc
itm.0576 | Chicken | livestock | base 25 xc
itm.0577 | Laying Hen | livestock | base 27 xc
itm.0578 | Rooster | livestock | base 29 xc
itm.0579 | Duck | livestock | base 31 xc
itm.0580 | Goose | livestock | base 33 xc
itm.0581 | Quail | livestock | base 35 xc
itm.0582 | Rabbit | livestock | base 37 xc
itm.0583 | Goat | livestock | base 39 xc
itm.0584 | Dairy Goat | livestock | base 41 xc
itm.0585 | Sheep | livestock | base 43 xc
itm.0586 | Merino Sheep | livestock | base 45 xc
itm.0587 | Pig | livestock | base 47 xc
itm.0588 | Calf | livestock | base 49 xc
itm.0589 | Dairy Cow | livestock | base 25 xc
itm.0590 | Water Buffalo | livestock | base 27 xc
itm.0591 | Draft Ox | livestock | base 29 xc
itm.0592 | Donkey | livestock | base 31 xc
itm.0593 | Mule | livestock | base 33 xc
itm.0594 | Horse | livestock | base 35 xc
itm.0595 | Bee Colony | livestock | base 37 xc
itm.0596 | Chicken Egg | animal | base 2 xc
itm.0597 | Duck Egg | animal | base 4 xc
itm.0598 | Quail Egg | animal | base 6 xc
itm.0599 | Goose Egg | animal | base 8 xc
itm.0600 | Raw Cow Milk | animal | base 10 xc
itm.0601 | Raw Goat Milk | animal | base 12 xc
itm.0602 | Buffalo Milk | animal | base 14 xc
itm.0603 | Fresh Cream | animal | base 16 xc
itm.0604 | Butter | animal | base 18 xc
itm.0605 | Fresh Cheese Curd | animal | base 20 xc
itm.0606 | Hard Cheese | animal | base 22 xc
itm.0607 | Yogurt | animal | base 24 xc
itm.0608 | Sheep Wool | animal | base 26 xc
itm.0609 | Merino Wool | animal | base 2 xc
itm.0610 | Goat Hair | animal | base 4 xc
itm.0611 | Raw Silk Hank | animal | base 6 xc
itm.0612 | Raw Rabbit Pelt | animal | base 8 xc
itm.0613 | Raw Goat Hide | animal | base 10 xc
itm.0614 | Raw Cowhide | animal | base 12 xc
itm.0615 | Raw Pigskin | animal | base 14 xc
itm.0616 | Feather Bundle | animal | base 16 xc
itm.0617 | Down Feather | animal | base 18 xc
itm.0618 | Beeswax Block | animal | base 20 xc
itm.0619 | Honey Jar | animal | base 22 xc
itm.0620 | Manure Sack | animal | base 24 xc
itm.0621 | Bone Bundle | animal | base 26 xc
itm.0622 | Tallow | animal | base 2 xc
itm.0623 | Raw Meat | animal | base 4 xc
itm.0624 | Poultry Meat | animal | base 6 xc
itm.0625 | Rabbit Meat (animal) | animal | base 8 xc
itm.0626 | Goat Meat | animal | base 10 xc
itm.0627 | Pork | animal | base 12 xc
itm.0628 | Beef | animal | base 14 xc
itm.0629 | Mutton | animal | base 16 xc
itm.0630 | Buffalo Meat | animal | base 18 xc
itm.0631 | Leather Offcut | animal | base 20 xc
itm.0632 | Horn Pair | animal | base 22 xc
itm.0633 | Fishmeal | animal | base 24 xc
itm.0634 | Compost | animal | base 26 xc
itm.0635 | Worm Castings | animal | base 2 xc
itm.0636 | Eggshell Powder | animal | base 4 xc
itm.0637 | Raw Honeycomb | animal | base 6 xc
itm.0638 | Animal Fat | animal | base 8 xc
itm.0639 | Rabbit Fur | animal | base 10 xc
itm.0640 | Dried Hide | animal | base 12 xc
itm.0641 | Rough Plank | processed | base 4 xc
itm.0642 | Smooth Plank | processed | base 6 xc
itm.0643 | Hardwood Board | processed | base 8 xc
itm.0644 | Timber Beam | processed | base 10 xc
itm.0645 | Wooden Peg | processed | base 12 xc
itm.0646 | Wooden Frame | processed | base 14 xc
itm.0647 | Charcoal Lump | processed | base 16 xc
itm.0648 | Lime Powder | processed | base 18 xc
itm.0649 | Cement Binder | processed | base 20 xc
itm.0650 | Clay Brick | processed | base 22 xc
itm.0651 | Roof Tile | processed | base 24 xc
itm.0652 | Ceramic Tile | processed | base 26 xc
itm.0653 | Earthenware Jar | processed | base 28 xc
itm.0654 | Storage Pot | processed | base 4 xc
itm.0655 | Glass Sand | processed | base 6 xc
itm.0656 | Glass Pane | processed | base 8 xc
itm.0657 | Clear Glass Bottle | processed | base 10 xc
itm.0658 | Iron Ingot | processed | base 12 xc
itm.0659 | Copper Ingot | processed | base 14 xc
itm.0660 | Tin Ingot | processed | base 16 xc
itm.0661 | Bronze Ingot | processed | base 18 xc
itm.0662 | Silver Ingot | processed | base 20 xc
itm.0663 | Gold Ingot | processed | base 22 xc
itm.0664 | Steel Ingot | processed | base 24 xc
itm.0665 | Lead Ingot | processed | base 26 xc
itm.0666 | Zinc Ingot | processed | base 28 xc
itm.0667 | Copper Wire Coil | processed | base 4 xc
itm.0668 | Iron Nail Box | processed | base 6 xc
itm.0669 | Iron Sheet | processed | base 8 xc
itm.0670 | Steel Plate | processed | base 10 xc
itm.0671 | Hemp Rope Coil | processed | base 12 xc
itm.0672 | Jute Rope Coil | processed | base 14 xc
itm.0673 | Cotton Thread Spool | processed | base 16 xc
itm.0674 | Linen Cloth Roll | processed | base 18 xc
itm.0675 | Cotton Cloth Roll | processed | base 20 xc
itm.0676 | Wool Cloth Roll | processed | base 22 xc
itm.0677 | Silk Cloth Roll | processed | base 24 xc
itm.0678 | Leather Sheet | processed | base 26 xc
itm.0679 | Treated Leather | processed | base 28 xc
itm.0680 | Paper Stack | processed | base 4 xc
itm.0681 | Parchment Sheet | processed | base 6 xc
itm.0682 | Ink Bottle | processed | base 8 xc
itm.0683 | Dried Herb Bundle | processed | base 10 xc
itm.0684 | Medicinal Powder | processed | base 12 xc
itm.0685 | Vegetable Oil Jar | processed | base 14 xc
itm.0686 | Sesame Oil Bottle | processed | base 16 xc
itm.0687 | Flour Sack | processed | base 18 xc
itm.0688 | Rice Flour Sack | processed | base 20 xc
itm.0689 | Bean Curd Block | processed | base 22 xc
itm.0690 | Dried Fish Pack | processed | base 24 xc
itm.0691 | Salted Fish Pack | processed | base 26 xc
itm.0692 | Smoked Meat Pack | processed | base 28 xc
itm.0693 | Pickled Vegetable Jar | processed | base 4 xc
itm.0694 | Fruit Jam Jar | processed | base 6 xc
itm.0695 | Vinegar Jar | processed | base 8 xc
itm.0696 | Soy Sauce Jar | processed | base 10 xc
itm.0697 | Fermented Bean Paste | processed | base 12 xc
itm.0698 | Baking Yeast Pot | processed | base 14 xc
itm.0699 | Compost Sack | processed | base 16 xc
itm.0700 | Animal Feed Sack | processed | base 18 xc
itm.0701 | Fish Feed Sack | processed | base 20 xc
itm.0702 | Seedling Tray | processed | base 22 xc
itm.0703 | Wooden Bucket (processed) | processed | base 24 xc
itm.0704 | Wooden Crate | processed | base 26 xc
itm.0705 | Storage Barrel | processed | base 28 xc
itm.0706 | Brick Mortar Sack | processed | base 4 xc
itm.0707 | Roof Thatch Bundle | processed | base 6 xc
itm.0708 | Woven Basket | processed | base 8 xc
itm.0709 | Fishing Net (processed) | processed | base 10 xc
itm.0710 | Hunting Snare | processed | base 12 xc
itm.0711 | Glass Bead String | processed | base 14 xc
itm.0712 | Copper Fitting | processed | base 16 xc
itm.0713 | Iron Hinge Pair | processed | base 18 xc
itm.0714 | Door Lock Set | processed | base 20 xc
itm.0715 | Stone Grinding Wheel | processed | base 22 xc
itm.0716 | Firebrick | processed | base 24 xc
itm.0717 | Drainage Tile | processed | base 26 xc
itm.0718 | Water Barrel | processed | base 28 xc
itm.0719 | Clay Jar | processed | base 4 xc
itm.0720 | Storage Jar | processed | base 6 xc
itm.0721 | Ceramic Jar Set | processed | base 8 xc
itm.0722 | Canvas Cloth | processed | base 10 xc
itm.0723 | Iron Rack | processed | base 12 xc
itm.0724 | Steel Gear | processed | base 14 xc
itm.0725 | Loom Shuttle | processed | base 16 xc
itm.0726 | Iron Fitting | processed | base 18 xc
itm.0727 | Stone Wall Block | processed | base 20 xc
itm.0728 | Steel Door Lock | processed | base 22 xc
itm.0729 | Iron Stove Plate | processed | base 24 xc
itm.0730 | Cotton Curtain | processed | base 26 xc
itm.0731 | Waxed Thread | processed | base 28 xc
itm.0732 | Sackcloth | processed | base 4 xc
itm.0733 | Leather Strap | processed | base 6 xc
itm.0734 | Wooden Wheel | processed | base 8 xc
itm.0735 | Cart Axle | processed | base 10 xc
itm.0736 | Nail Bundle | processed | base 12 xc
itm.0737 | Brick Paver | processed | base 14 xc
itm.0738 | Roof Beam | processed | base 16 xc
itm.0739 | Fence Section | processed | base 18 xc
itm.0740 | Gate Section | processed | base 20 xc
itm.0741 | Steamed Rice | food | base 5 xc
itm.0742 | Rice Porridge | food | base 7 xc
itm.0743 | Chicken Rice Bowl | food | base 9 xc
itm.0744 | Vegetable Rice Bowl | food | base 11 xc
itm.0745 | Fried Rice | food | base 13 xc
itm.0746 | Sticky Rice Cake | food | base 15 xc
itm.0747 | Rice Dumpling | food | base 17 xc
itm.0748 | Rice Flour Cake | food | base 19 xc
itm.0749 | Rice Noodle | food | base 21 xc
itm.0750 | Rice Vermicelli | food | base 23 xc
itm.0751 | Wheat Flatbread | food | base 25 xc
itm.0752 | Steamed Wheat Bun | food | base 27 xc
itm.0753 | Scallion Pancake | food | base 29 xc
itm.0754 | Hand-Pulled Noodles | food | base 5 xc
itm.0755 | Wheat Noodle Soup | food | base 7 xc
itm.0756 | Dumpling Wrapper | food | base 9 xc
itm.0757 | Vegetable Dumplings | food | base 11 xc
itm.0758 | Pork Dumplings | food | base 13 xc
itm.0759 | Steamed Meat Buns | food | base 15 xc
itm.0760 | Sesame Bread | food | base 17 xc
itm.0761 | Barley Porridge | food | base 19 xc
itm.0762 | Millet Porridge | food | base 21 xc
itm.0763 | Oatmeal Bowl | food | base 23 xc
itm.0764 | Cornmeal Porridge | food | base 25 xc
itm.0765 | Buckwheat Pancake | food | base 27 xc
itm.0766 | Bean Sprout Salad | food | base 29 xc
itm.0767 | Soy Milk | food | base 5 xc
itm.0768 | Tofu Block | food | base 7 xc
itm.0769 | Fried Tofu | food | base 9 xc
itm.0770 | Braised Tofu | food | base 11 xc
itm.0771 | Peanut Soup | food | base 13 xc
itm.0772 | Red Bean Paste | food | base 15 xc
itm.0773 | Mung Bean Soup | food | base 17 xc
itm.0774 | Black Bean Stew | food | base 19 xc
itm.0775 | Sesame Congee | food | base 21 xc
itm.0776 | Roasted Sweet Potato | food | base 23 xc
itm.0777 | Boiled Potato | food | base 25 xc
itm.0778 | Potato Pancake | food | base 27 xc
itm.0779 | Taro Cake | food | base 29 xc
itm.0780 | Cassava Cake | food | base 5 xc
itm.0781 | Carrot Soup | food | base 7 xc
itm.0782 | Radish Broth | food | base 9 xc
itm.0783 | Turnip Stew | food | base 11 xc
itm.0784 | Cabbage Soup | food | base 13 xc
itm.0785 | Pickled Cabbage | food | base 15 xc
itm.0786 | Spinach Soup | food | base 17 xc
itm.0787 | Mustard Green Pickle | food | base 19 xc
itm.0788 | Bok Choy Stir-Fry | food | base 21 xc
itm.0789 | Celery Stir-Fry | food | base 23 xc
itm.0790 | Leek Pancake | food | base 25 xc
itm.0791 | Onion Soup | food | base 27 xc
itm.0792 | Garlic Greens | food | base 29 xc
itm.0793 | Ginger Broth | food | base 5 xc
itm.0794 | Turmeric Rice | food | base 7 xc
itm.0795 | Chili Oil | food | base 9 xc
itm.0796 | Bell Pepper Stir-Fry | food | base 11 xc
itm.0797 | Tomato Egg Stir-Fry | food | base 13 xc
itm.0798 | Eggplant Stew | food | base 15 xc
itm.0799 | Cucumber Salad | food | base 17 xc
itm.0800 | Pumpkin Soup | food | base 19 xc
itm.0801 | Bitter Melon Stir-Fry | food | base 21 xc
itm.0802 | Okra Soup | food | base 23 xc
itm.0803 | Green Bean Stir-Fry | food | base 25 xc
itm.0804 | Pea Stew | food | base 27 xc
itm.0805 | Long Bean Curry | food | base 29 xc
itm.0806 | Broccoli Soup | food | base 5 xc
itm.0807 | Cauliflower Bake | food | base 7 xc
itm.0808 | Zucchini Fritters | food | base 9 xc
itm.0809 | Watermelon Slices | food | base 11 xc
itm.0810 | Melon Slices | food | base 13 xc
itm.0811 | Strawberry Preserve | food | base 15 xc
itm.0812 | Blueberry Jam | food | base 17 xc
itm.0813 | Raspberry Syrup | food | base 19 xc
itm.0814 | Blackberry Tart | food | base 21 xc
itm.0815 | Grape Juice | food | base 23 xc
itm.0816 | Mulberry Jam | food | base 25 xc
itm.0817 | Pineapple Cake | food | base 27 xc
itm.0818 | Banana Fritter | food | base 29 xc
itm.0819 | Papaya Salad | food | base 5 xc
itm.0820 | Mango Chutney | food | base 7 xc
itm.0821 | Guava Nectar | food | base 9 xc
itm.0822 | Lime Cordial | food | base 11 xc
itm.0823 | Lemon Tea | food | base 13 xc
itm.0824 | Orange Marmalade | food | base 15 xc
itm.0825 | Pomelo Salad | food | base 17 xc
itm.0826 | Coconut Rice | food | base 19 xc
itm.0827 | Apple Compote | food | base 21 xc
itm.0828 | Pear Tart | food | base 23 xc
itm.0829 | Peach Preserve | food | base 25 xc
itm.0830 | Plum Sauce | food | base 27 xc
itm.0831 | Apricot Cake | food | base 29 xc
itm.0832 | Persimmon Pudding | food | base 5 xc
itm.0833 | Jujube Tea | food | base 7 xc
itm.0834 | Longan Sweet Soup | food | base 9 xc
itm.0835 | Lychee Jelly | food | base 11 xc
itm.0836 | Pomegranate Syrup | food | base 13 xc
itm.0837 | Fig Cake | food | base 15 xc
itm.0838 | Roasted Fish | food | base 17 xc
itm.0839 | Fish Soup | food | base 19 xc
itm.0840 | Steamed River Carp | food | base 21 xc
itm.0841 | Herbal Poultice | medicine | base 8 xc
itm.0842 | Wound Dressing | medicine | base 10 xc
itm.0843 | Clean Bandage Roll | medicine | base 12 xc
itm.0844 | Antiseptic Herb Wash | medicine | base 14 xc
itm.0845 | Cooling Salve | medicine | base 16 xc
itm.0846 | Burn Ointment | medicine | base 18 xc
itm.0847 | Bruise Balm | medicine | base 20 xc
itm.0848 | Cough Syrup | medicine | base 22 xc
itm.0849 | Fever Tea Pack | medicine | base 24 xc
itm.0850 | Digestive Tea | medicine | base 26 xc
itm.0851 | Ginger Tonic | medicine | base 28 xc
itm.0852 | Rehydration Broth | medicine | base 30 xc
itm.0853 | Basic Healing Pill | medicine | base 32 xc
itm.0854 | Minor Qi Recovery Pellet | medicine | base 8 xc
itm.0855 | Herbal Sleep Sachet | medicine | base 10 xc
itm.0856 | Mosquito Repellent | medicine | base 12 xc
itm.0857 | Insect Bite Balm | medicine | base 14 xc
itm.0858 | Splint Kit | medicine | base 16 xc
itm.0859 | Bone Setting Kit | medicine | base 18 xc
itm.0860 | Suture Kit | medicine | base 20 xc
itm.0861 | Disinfectant Spirit | medicine | base 22 xc
itm.0862 | Travel Medicine Pack | medicine | base 24 xc
itm.0863 | Antidote Paste | medicine | base 26 xc
itm.0864 | Stomach Soothing Decoction | medicine | base 28 xc
itm.0865 | Throat Lozenge | medicine | base 30 xc
itm.0866 | Calming Incense | medicine | base 32 xc
itm.0867 | Herbal Compress | medicine | base 8 xc
itm.0868 | Poultice Cloth | medicine | base 10 xc
itm.0869 | Medicinal Oil | medicine | base 12 xc
itm.0870 | Emergency Medical Kit | medicine | base 14 xc
itm.0871 | Thatched Roof Panel | household | base 8 xc
itm.0872 | Wooden Door | household | base 10 xc
itm.0873 | Wooden Window Frame | household | base 12 xc
itm.0874 | Wooden Bed Frame | household | base 14 xc
itm.0875 | Simple Bedroll | household | base 16 xc
itm.0876 | Wooden Stool | household | base 18 xc
itm.0877 | Wooden Chair | household | base 20 xc
itm.0878 | Wooden Table | household | base 22 xc
itm.0879 | Storage Chest | household | base 24 xc
itm.0880 | Small Cupboard | household | base 26 xc
itm.0881 | Bookshelf | household | base 28 xc
itm.0882 | Rice Storage Bin | household | base 30 xc
itm.0883 | Water Barrel (household) | household | base 32 xc
itm.0884 | Rain Catchment Barrel | household | base 8 xc
itm.0885 | Stone Well Ring | household | base 10 xc
itm.0886 | Brick Well Lining | household | base 12 xc
itm.0887 | Clay Cooking Stove | household | base 14 xc
itm.0888 | Brick Hearth | household | base 16 xc
itm.0889 | Stone Hearth | household | base 18 xc
itm.0890 | Fence Section (household) | household | base 20 xc
itm.0891 | Gate Section (household) | household | base 22 xc
itm.0892 | Wooden Bridge Plank | household | base 24 xc
itm.0893 | Footpath Paving Stone | household | base 26 xc
itm.0894 | Drainage Tile (household) | household | base 28 xc
itm.0895 | Roof Tile Bundle | household | base 30 xc
itm.0896 | Clay Water Jar | household | base 32 xc
itm.0897 | Ceramic Bowl Set | household | base 8 xc
itm.0898 | Wooden Bowl Set | household | base 10 xc
itm.0899 | Cooking Ladle | household | base 12 xc
itm.0900 | Wooden Spoon | household | base 14 xc
itm.0901 | Iron Ladle | household | base 16 xc
itm.0902 | Woven Mat | household | base 18 xc
itm.0903 | Straw Mattress | household | base 20 xc
itm.0904 | Cotton Pillow | household | base 22 xc
itm.0905 | Wool Blanket | household | base 24 xc
itm.0906 | Linen Curtain | household | base 26 xc
itm.0907 | Paper Lantern | household | base 28 xc
itm.0908 | Oil Lamp | household | base 30 xc
itm.0909 | Wall Hook Set | household | base 32 xc
itm.0910 | Door Hinge Set | household | base 8 xc
itm.0911 | Door Latch | household | base 10 xc
itm.0912 | Window Shutter | household | base 12 xc
itm.0913 | Wooden Signboard | household | base 14 xc
itm.0914 | Market Stall Frame | household | base 16 xc
itm.0915 | Storage Shelf | household | base 18 xc
itm.0916 | Grain Sack | household | base 20 xc
itm.0917 | Flour Sack (household) | household | base 22 xc
itm.0918 | Seed Storage Jar | household | base 24 xc
itm.0919 | Tool Rack | household | base 26 xc
itm.0920 | Chicken Nest Box | household | base 28 xc
itm.0921 | Animal Trough | household | base 30 xc
itm.0922 | Feed Bin | household | base 32 xc
itm.0923 | Fish Basket | household | base 8 xc
itm.0924 | Fish Drying Rack | household | base 10 xc
itm.0925 | Compost Bin | household | base 12 xc
itm.0926 | Raised Garden Bed | household | base 14 xc
itm.0927 | Irrigation Channel Section | household | base 16 xc
itm.0928 | Stone Drain Cover | household | base 18 xc
itm.0929 | Clay Flower Pot | household | base 20 xc
itm.0930 | Planter Box | household | base 22 xc
itm.0931 | Beehive Box | household | base 24 xc
itm.0932 | Silkworm Tray | household | base 26 xc
itm.0933 | Fishing Dock Plank | household | base 28 xc
itm.0934 | Small Boat Oar | household | base 30 xc
itm.0935 | Handcart Wheel | household | base 32 xc
itm.0936 | Waterwheel Gear | household | base 8 xc
itm.0937 | Woven Straw Hat | household | base 10 xc
itm.0938 | Cotton Work Gloves | household | base 12 xc
itm.0939 | Leather Work Gloves | household | base 14 xc
itm.0940 | Rain Cloak | household | base 16 xc
itm.0941 | Linen Shirt | household | base 18 xc
itm.0942 | Cotton Tunic | household | base 20 xc
itm.0943 | Wool Cloak | household | base 22 xc
itm.0944 | Leather Apron | household | base 24 xc
itm.0945 | Canvas Satchel | household | base 26 xc
itm.0946 | Herb Pouch | household | base 28 xc
itm.0947 | Coin Purse | household | base 30 xc
itm.0948 | Leather Belt | household | base 32 xc
itm.0949 | Rope Sandals | household | base 8 xc
itm.0950 | Leather Boots | household | base 10 xc
itm.0951 | Candle | craft | base 4 xc
itm.0952 | Beeswax Candle | craft | base 6 xc
itm.0953 | Lantern Oil | craft | base 8 xc
itm.0954 | Lamp Wick | craft | base 10 xc
itm.0955 | Writing Paper | craft | base 12 xc
itm.0956 | Ledger Book | craft | base 14 xc
itm.0957 | Map Parchment | craft | base 16 xc
itm.0958 | Thread Spool | craft | base 18 xc
itm.0959 | Needle Pack | craft | base 20 xc
itm.0960 | Leather Patch | craft | base 22 xc
itm.0961 | Rope Handle | craft | base 24 xc
itm.0962 | Net Weight | craft | base 26 xc
itm.0963 | Net Float | craft | base 28 xc
itm.0964 | Fish Trap | craft | base 4 xc
itm.0965 | Crab Trap | craft | base 6 xc
itm.0966 | Bird Cage | craft | base 8 xc
itm.0967 | Poultry Waterer | craft | base 10 xc
itm.0968 | Feed Trough | craft | base 12 xc
itm.0969 | Egg Crate | craft | base 14 xc
itm.0970 | Milk Can | craft | base 16 xc
itm.0971 | Cheese Cloth | craft | base 18 xc
itm.0972 | Butter Mold | craft | base 20 xc
itm.0973 | Salt Crock | craft | base 22 xc
itm.0974 | Fermentation Jar | craft | base 24 xc
itm.0975 | Pickling Crock | craft | base 26 xc
itm.0976 | Oil Jar | craft | base 28 xc
itm.0977 | Vinegar Bottle | craft | base 4 xc
itm.0978 | Sauce Bottle | craft | base 6 xc
itm.0979 | Grain Scoop | craft | base 8 xc
itm.0980 | Flour Sieve | craft | base 10 xc
itm.0981 | Rice Winnowing Tray | craft | base 12 xc
itm.0982 | Grain Measure | craft | base 14 xc
itm.0983 | Seed Measure | craft | base 16 xc
itm.0984 | Water Jug | craft | base 18 xc
itm.0985 | Tea Cup | craft | base 20 xc
itm.0986 | Tea Pot | craft | base 22 xc
itm.0987 | Rice Bowl | craft | base 24 xc
itm.0988 | Serving Tray | craft | base 26 xc
itm.0989 | Wooden Chopsticks | craft | base 28 xc
itm.0990 | Iron Chopsticks | craft | base 4 xc
itm.0991 | Cooking Spatula | craft | base 6 xc
itm.0992 | Soup Ladle | craft | base 8 xc
itm.0993 | Storage Basket | craft | base 10 xc
itm.0994 | Harvest Crate | craft | base 12 xc
itm.0995 | Produce Crate | craft | base 14 xc
itm.0996 | Fish Crate | craft | base 16 xc
itm.0997 | Meat Hook | craft | base 18 xc
itm.0998 | Smokehouse Hook | craft | base 20 xc
itm.0999 | Drying Frame | craft | base 22 xc
itm.1000 | Cloth Bolt | craft | base 24 xc

## Facility listing (200)
facility.water.01 | Village Well | Water & sanitation | cash fee 22 xc + 20 Fieldstone, 12 Pine Log, 4 Rough Plank, 4 Rope Coil | 480 sim min
facility.water.02 | Stone-Lined Well | Water & sanitation | cash fee 41 xc + 22 Fieldstone, 13 Pine Log, 5 Rough Plank, 5 Rope Coil | 660 sim min
facility.water.03 | Deep Draw Well | Water & sanitation | cash fee 67 xc + 24 Fieldstone, 14 Pine Log, 6 Rough Plank, 6 Rope Coil | 840 sim min
facility.water.04 | Spring Cistern | Water & sanitation | cash fee 39 xc + 26 Fieldstone, 15 Pine Log, 7 Rough Plank, 7 Rope Coil | 1020 sim min
facility.water.05 | Rainwater Cistern | Water & sanitation | cash fee 68 xc + 28 Fieldstone, 16 Pine Log, 8 Rough Plank, 8 Rope Coil | 1200 sim min
facility.water.06 | Water Tower | Water & sanitation | cash fee 105 xc + 30 Fieldstone, 17 Pine Log, 9 Rough Plank, 9 Rope Coil | 1380 sim min
facility.water.07 | Public Washhouse | Water & sanitation | cash fee 56 xc + 32 Fieldstone, 18 Pine Log, 10 Rough Plank, 10 Rope Coil | 1560 sim min
facility.water.08 | Water Filter House | Water & sanitation | cash fee 96 xc + 34 Fieldstone, 19 Pine Log, 11 Rough Plank, 11 Rope Coil | 1740 sim min
facility.water.09 | Irrigation Reservoir | Water & sanitation | cash fee 144 xc + 36 Fieldstone, 20 Pine Log, 12 Rough Plank, 12 Rope Coil | 1920 sim min
facility.water.10 | Drainage Pump House | Water & sanitation | cash fee 72 xc + 38 Fieldstone, 21 Pine Log, 13 Rough Plank, 13 Rope Coil | 2100 sim min
facility.forestry.01 | Woodcutter's Yard | Forestry & timber | cash fee 32 xc + 20 Pine Log, 12 Fieldstone, 4 Rough Plank, 4 Rope Coil | 690 sim min
facility.forestry.02 | Timber Camp | Forestry & timber | cash fee 59 xc + 22 Pine Log, 13 Fieldstone, 5 Rough Plank, 5 Rope Coil | 870 sim min
facility.forestry.03 | Sawmill | Forestry & timber | cash fee 95 xc + 24 Pine Log, 14 Fieldstone, 6 Rough Plank, 6 Rope Coil | 1050 sim min
facility.forestry.04 | Fine Sawmill | Forestry & timber | cash fee 51 xc + 26 Pine Log, 15 Fieldstone, 7 Rough Plank, 7 Rope Coil | 1230 sim min
facility.forestry.05 | Bamboo Splitter Yard | Forestry & timber | cash fee 91 xc + 28 Pine Log, 16 Fieldstone, 8 Rough Plank, 8 Rope Coil | 1410 sim min
facility.forestry.06 | Charcoal Kiln | Forestry & timber | cash fee 140 xc + 30 Pine Log, 17 Fieldstone, 9 Rough Plank, 9 Rope Coil | 1590 sim min
facility.forestry.07 | Resin Tap Station | Forestry & timber | cash fee 70 xc + 32 Pine Log, 18 Fieldstone, 10 Rough Plank, 10 Rope Coil | 1770 sim min
facility.forestry.08 | Log Sorting Shed | Forestry & timber | cash fee 123 xc + 34 Pine Log, 19 Fieldstone, 11 Rough Plank, 11 Rope Coil | 1950 sim min
facility.forestry.09 | Timber Drying Barn | Forestry & timber | cash fee 185 xc + 36 Pine Log, 20 Fieldstone, 12 Rough Plank, 12 Rope Coil | 2130 sim min
facility.forestry.10 | Coppice Nursery | Forestry & timber | cash fee 89 xc + 38 Pine Log, 21 Fieldstone, 13 Rough Plank, 13 Rope Coil | 2310 sim min
facility.quarry.01 | Quarry Camp | Stone & mining | cash fee 62 xc + 20 Fieldstone, 12 Pine Log, 4 Rough Plank, 4 Rope Coil | 900 sim min
facility.quarry.02 | Granite Quarry | Stone & mining | cash fee 124 xc + 22 Fieldstone, 13 Pine Log, 5 Rough Plank, 5 Rope Coil | 1080 sim min
facility.quarry.03 | Limestone Quarry | Stone & mining | cash fee 204 xc + 24 Fieldstone, 14 Pine Log, 6 Rough Plank, 6 Rope Coil | 1260 sim min
facility.quarry.04 | Clay Pit | Stone & mining | cash fee 94 xc + 26 Fieldstone, 15 Pine Log, 7 Rough Plank, 7 Rope Coil | 1440 sim min
facility.quarry.05 | Sand & Gravel Yard | Stone & mining | cash fee 182 xc + 28 Fieldstone, 16 Pine Log, 8 Rough Plank, 8 Rope Coil | 1620 sim min
facility.quarry.06 | Mine Shaft | Stone & mining | cash fee 288 xc + 30 Fieldstone, 17 Pine Log, 9 Rough Plank, 9 Rope Coil | 1800 sim min
facility.quarry.07 | Ventilated Mine Shaft | Stone & mining | cash fee 126 xc + 32 Fieldstone, 18 Pine Log, 10 Rough Plank, 10 Rope Coil | 1980 sim min
facility.quarry.08 | Ore Sorting Shed | Stone & mining | cash fee 240 xc + 34 Fieldstone, 19 Pine Log, 11 Rough Plank, 11 Rope Coil | 2160 sim min
facility.quarry.09 | Stone Cutting Yard | Stone & mining | cash fee 371 xc + 36 Fieldstone, 20 Pine Log, 12 Rough Plank, 12 Rope Coil | 2340 sim min
facility.quarry.10 | Gemstone Sorting Room | Stone & mining | cash fee 157 xc + 38 Fieldstone, 21 Pine Log, 13 Rough Plank, 13 Rope Coil | 2520 sim min
facility.farm.01 | Farm Plot | Farming & horticulture | cash fee 44 xc + 20 Fieldstone, 12 Pine Log, 4 Rough Plank, 4 Compost Sack | 1110 sim min
facility.farm.02 | Terraced Farm | Farming & horticulture | cash fee 75 xc + 22 Fieldstone, 13 Pine Log, 5 Rough Plank, 5 Compost Sack | 1290 sim min
facility.farm.03 | Irrigated Field | Farming & horticulture | cash fee 114 xc + 24 Fieldstone, 14 Pine Log, 6 Rough Plank, 6 Compost Sack | 1470 sim min
facility.farm.04 | Kitchen Garden | Farming & horticulture | cash fee 60 xc + 26 Fieldstone, 15 Pine Log, 7 Rough Plank, 7 Compost Sack | 1650 sim min
facility.farm.05 | Seed Nursery | Farming & horticulture | cash fee 103 xc + 28 Fieldstone, 16 Pine Log, 8 Rough Plank, 8 Compost Sack | 1830 sim min
facility.farm.06 | Orchard | Farming & horticulture | cash fee 152 xc + 30 Fieldstone, 17 Pine Log, 9 Rough Plank, 9 Compost Sack | 2010 sim min
facility.farm.07 | Greenhouse | Farming & horticulture | cash fee 77 xc + 32 Fieldstone, 18 Pine Log, 10 Rough Plank, 10 Compost Sack | 2190 sim min
facility.farm.08 | Mushroom House | Farming & horticulture | cash fee 130 xc + 34 Fieldstone, 19 Pine Log, 11 Rough Plank, 11 Compost Sack | 2370 sim min
facility.farm.09 | Herb Garden | Farming & horticulture | cash fee 190 xc + 36 Fieldstone, 20 Pine Log, 12 Rough Plank, 12 Compost Sack | 2550 sim min
facility.farm.10 | Rice Paddy | Farming & horticulture | cash fee 94 xc + 38 Fieldstone, 21 Pine Log, 13 Rough Plank, 13 Compost Sack | 2730 sim min
facility.fish.01 | Fish Pond | Aquaculture & fishing | cash fee 61 xc + 20 Clay Brick, 12 Fieldstone, 4 Water Barrel, 4 Rough Plank | 1320 sim min
facility.fish.02 | Lined Fish Pond | Aquaculture & fishing | cash fee 110 xc + 22 Clay Brick, 13 Fieldstone, 5 Water Barrel, 5 Rough Plank | 1500 sim min
facility.fish.03 | Carp Breeding Pond | Aquaculture & fishing | cash fee 170 xc + 24 Clay Brick, 14 Fieldstone, 6 Water Barrel, 6 Rough Plank | 1680 sim min
facility.fish.04 | Tilapia Pond | Aquaculture & fishing | cash fee 83 xc + 26 Clay Brick, 15 Fieldstone, 7 Water Barrel, 7 Rough Plank | 1860 sim min
facility.fish.05 | Shrimp Pond | Aquaculture & fishing | cash fee 147 xc + 28 Clay Brick, 16 Fieldstone, 8 Water Barrel, 8 Rough Plank | 2040 sim min
facility.fish.06 | Crab Pond | Aquaculture & fishing | cash fee 221 xc + 30 Clay Brick, 17 Fieldstone, 9 Water Barrel, 9 Rough Plank | 2220 sim min
facility.fish.07 | Fish Hatchery | Aquaculture & fishing | cash fee 104 xc + 32 Clay Brick, 18 Fieldstone, 10 Water Barrel, 10 Rough Plank | 2400 sim min
facility.fish.08 | Fishing Hut | Aquaculture & fishing | cash fee 183 xc + 34 Clay Brick, 19 Fieldstone, 11 Water Barrel, 11 Rough Plank | 2580 sim min
facility.fish.09 | Fish Landing Dock | Aquaculture & fishing | cash fee 272 xc + 36 Clay Brick, 20 Fieldstone, 12 Water Barrel, 12 Rough Plank | 2760 sim min
facility.fish.10 | Aquatic Plant Bed | Aquaculture & fishing | cash fee 125 xc + 38 Clay Brick, 21 Fieldstone, 13 Water Barrel, 13 Rough Plank | 2940 sim min
facility.animals.01 | Poultry Coop | Poultry & livestock | cash fee 61 xc + 20 Pine Log, 12 Rough Plank, 4 Fieldstone, 4 Roof Thatch Bundle | 1530 sim min
facility.animals.02 | Duck House | Poultry & livestock | cash fee 105 xc + 22 Pine Log, 13 Rough Plank, 5 Fieldstone, 5 Roof Thatch Bundle | 1710 sim min
facility.animals.03 | Quail House | Poultry & livestock | cash fee 156 xc + 24 Pine Log, 14 Rough Plank, 6 Fieldstone, 6 Roof Thatch Bundle | 1890 sim min
facility.animals.04 | Rabbit Hutch | Poultry & livestock | cash fee 79 xc + 26 Pine Log, 15 Rough Plank, 7 Fieldstone, 7 Roof Thatch Bundle | 2070 sim min
facility.animals.05 | Livestock Barn | Poultry & livestock | cash fee 134 xc + 28 Pine Log, 16 Rough Plank, 8 Fieldstone, 8 Roof Thatch Bundle | 2250 sim min
facility.animals.06 | Dairy Barn | Poultry & livestock | cash fee 198 xc + 30 Pine Log, 17 Rough Plank, 9 Fieldstone, 9 Roof Thatch Bundle | 2430 sim min
facility.animals.07 | Sheepfold | Poultry & livestock | cash fee 97 xc + 32 Pine Log, 18 Rough Plank, 10 Fieldstone, 10 Roof Thatch Bundle | 2610 sim min
facility.animals.08 | Pig Pen | Poultry & livestock | cash fee 164 xc + 34 Pine Log, 19 Rough Plank, 11 Fieldstone, 11 Roof Thatch Bundle | 2790 sim min
facility.animals.09 | Horse Stable | Poultry & livestock | cash fee 240 xc + 36 Pine Log, 20 Rough Plank, 12 Fieldstone, 12 Roof Thatch Bundle | 2970 sim min
facility.animals.10 | Pasture & Fence | Poultry & livestock | cash fee 115 xc + 38 Pine Log, 21 Rough Plank, 13 Fieldstone, 13 Roof Thatch Bundle | 3150 sim min
facility.apiary.01 | Apiary | Apiary & sericulture | cash fee 72 xc + 20 Pine Log, 12 Rough Plank, 4 Mulberry Leaf, 4 Woven Basket | 1740 sim min
facility.apiary.02 | Bee Yard | Apiary & sericulture | cash fee 125 xc + 22 Pine Log, 13 Rough Plank, 5 Mulberry Leaf, 5 Woven Basket | 1920 sim min
facility.apiary.03 | Honey House | Apiary & sericulture | cash fee 186 xc + 24 Pine Log, 14 Rough Plank, 6 Mulberry Leaf, 6 Woven Basket | 2100 sim min
facility.apiary.04 | Wax Workshop | Apiary & sericulture | cash fee 91 xc + 26 Pine Log, 15 Rough Plank, 7 Mulberry Leaf, 7 Woven Basket | 2280 sim min
facility.apiary.05 | Silkworm House | Apiary & sericulture | cash fee 157 xc + 28 Pine Log, 16 Rough Plank, 8 Mulberry Leaf, 8 Woven Basket | 2460 sim min
facility.apiary.06 | Mulberry Silkworm Court | Apiary & sericulture | cash fee 231 xc + 30 Pine Log, 17 Rough Plank, 9 Mulberry Leaf, 9 Woven Basket | 2640 sim min
facility.apiary.07 | Cocoon Sorting Room | Apiary & sericulture | cash fee 110 xc + 32 Pine Log, 18 Rough Plank, 10 Mulberry Leaf, 10 Woven Basket | 2820 sim min
facility.apiary.08 | Silk Reeling House | Apiary & sericulture | cash fee 188 xc + 34 Pine Log, 19 Rough Plank, 11 Mulberry Leaf, 11 Woven Basket | 3000 sim min
facility.apiary.09 | Sericulture Nursery | Apiary & sericulture | cash fee 275 xc + 36 Pine Log, 20 Rough Plank, 12 Mulberry Leaf, 12 Woven Basket | 3180 sim min
facility.apiary.10 | Pollinator Garden | Apiary & sericulture | cash fee 129 xc + 38 Pine Log, 21 Rough Plank, 13 Mulberry Leaf, 13 Woven Basket | 3360 sim min
facility.food.01 | Community Kitchen | Food processing | cash fee 84 xc + 20 Clay Brick, 12 Pine Log, 4 Rough Plank, 4 Firewood Bundle | 1950 sim min
facility.food.02 | Village Kitchen | Food processing | cash fee 146 xc + 22 Clay Brick, 13 Pine Log, 5 Rough Plank, 5 Firewood Bundle | 2130 sim min
facility.food.03 | Commercial Kitchen | Food processing | cash fee 218 xc + 24 Clay Brick, 14 Pine Log, 6 Rough Plank, 6 Firewood Bundle | 2310 sim min
facility.food.04 | Bakery | Food processing | cash fee 104 xc + 26 Clay Brick, 15 Pine Log, 7 Rough Plank, 7 Firewood Bundle | 2490 sim min
facility.food.05 | Noodle Workshop | Food processing | cash fee 180 xc + 28 Clay Brick, 16 Pine Log, 8 Rough Plank, 8 Firewood Bundle | 2670 sim min
facility.food.06 | Tofu Workshop | Food processing | cash fee 266 xc + 30 Clay Brick, 17 Pine Log, 9 Rough Plank, 9 Firewood Bundle | 2850 sim min
facility.food.07 | Preserving Kitchen | Food processing | cash fee 124 xc + 32 Clay Brick, 18 Pine Log, 10 Rough Plank, 10 Firewood Bundle | 3030 sim min
facility.food.08 | Pickling House | Food processing | cash fee 214 xc + 34 Clay Brick, 19 Pine Log, 11 Rough Plank, 11 Firewood Bundle | 3210 sim min
facility.food.09 | Smokehouse | Food processing | cash fee 314 xc + 36 Clay Brick, 20 Pine Log, 12 Rough Plank, 12 Firewood Bundle | 3390 sim min
facility.food.10 | Food Drying House | Food processing | cash fee 144 xc + 38 Clay Brick, 21 Pine Log, 13 Rough Plank, 13 Firewood Bundle | 3570 sim min
facility.grain.01 | Grain Mill | Grain & oil processing | cash fee 101 xc + 20 Timber Beam, 12 Fieldstone, 4 Rough Plank, 4 Iron Fitting | 2160 sim min
facility.grain.02 | Rice Mill | Grain & oil processing | cash fee 179 xc + 22 Timber Beam, 13 Fieldstone, 5 Rough Plank, 5 Iron Fitting | 2340 sim min
facility.grain.03 | Flour Mill | Grain & oil processing | cash fee 267 xc + 24 Timber Beam, 14 Fieldstone, 6 Rough Plank, 6 Iron Fitting | 2520 sim min
facility.grain.04 | Rice Threshing Shed | Grain & oil processing | cash fee 123 xc + 26 Timber Beam, 15 Fieldstone, 7 Rough Plank, 7 Iron Fitting | 2700 sim min
facility.grain.05 | Grain Winnery | Grain & oil processing | cash fee 217 xc + 28 Timber Beam, 16 Fieldstone, 8 Rough Plank, 8 Iron Fitting | 2880 sim min
facility.grain.06 | Oil Press | Grain & oil processing | cash fee 322 xc + 30 Timber Beam, 17 Fieldstone, 9 Rough Plank, 9 Iron Fitting | 3060 sim min
facility.grain.07 | Sesame Oil Press | Grain & oil processing | cash fee 146 xc + 32 Timber Beam, 18 Fieldstone, 10 Rough Plank, 10 Iron Fitting | 3240 sim min
facility.grain.08 | Bean Processing House | Grain & oil processing | cash fee 256 xc + 34 Timber Beam, 19 Fieldstone, 11 Rough Plank, 11 Iron Fitting | 3420 sim min
facility.grain.09 | Starch Workshop | Grain & oil processing | cash fee 376 xc + 36 Timber Beam, 20 Fieldstone, 12 Rough Plank, 12 Iron Fitting | 3600 sim min
facility.grain.10 | Feed Mill | Grain & oil processing | cash fee 168 xc + 38 Timber Beam, 21 Fieldstone, 13 Rough Plank, 13 Iron Fitting | 3780 sim min
facility.smith.01 | Blacksmith Forge | Metal & forge | cash fee 134 xc + 20 Fieldstone, 12 Clay Brick, 4 Timber Beam, 4 Firewood Bundle | 2370 sim min
facility.smith.02 | Village Smithy | Metal & forge | cash fee 245 xc + 22 Fieldstone, 13 Clay Brick, 5 Timber Beam, 5 Firewood Bundle | 2550 sim min
facility.smith.03 | Toolsmith Workshop | Metal & forge | cash fee 371 xc + 24 Fieldstone, 14 Clay Brick, 6 Timber Beam, 6 Firewood Bundle | 2730 sim min
facility.smith.04 | Ore Smelter | Metal & forge | cash fee 162 xc + 26 Fieldstone, 15 Clay Brick, 7 Timber Beam, 7 Firewood Bundle | 2910 sim min
facility.smith.05 | Bloomery Furnace | Metal & forge | cash fee 295 xc + 28 Fieldstone, 16 Clay Brick, 8 Timber Beam, 8 Firewood Bundle | 3090 sim min
facility.smith.06 | Copper Foundry | Metal & forge | cash fee 442 xc + 30 Fieldstone, 17 Clay Brick, 9 Timber Beam, 9 Firewood Bundle | 3270 sim min
facility.smith.07 | Iron Foundry | Metal & forge | cash fee 189 xc + 32 Fieldstone, 18 Clay Brick, 10 Timber Beam, 10 Firewood Bundle | 3450 sim min
facility.smith.08 | Steel Furnace | Metal & forge | cash fee 344 xc + 34 Fieldstone, 19 Clay Brick, 11 Timber Beam, 11 Firewood Bundle | 3630 sim min
facility.smith.09 | Metal Casting Yard | Metal & forge | cash fee 513 xc + 36 Fieldstone, 20 Clay Brick, 12 Timber Beam, 12 Firewood Bundle | 3810 sim min
facility.smith.10 | Metal Repair Shop | Metal & forge | cash fee 217 xc + 38 Fieldstone, 21 Clay Brick, 13 Timber Beam, 13 Firewood Bundle | 3990 sim min
facility.textile.01 | Weaving House | Textile & leather | cash fee 120 xc + 20 Timber Beam, 12 Rough Plank, 4 Rope Coil, 4 Canvas Cloth | 2580 sim min
facility.textile.02 | Spinning Room | Textile & leather | cash fee 210 xc + 22 Timber Beam, 13 Rough Plank, 5 Rope Coil, 5 Canvas Cloth | 2760 sim min
facility.textile.03 | Ropewalk | Textile & leather | cash fee 311 xc + 24 Timber Beam, 14 Rough Plank, 6 Rope Coil, 6 Canvas Cloth | 2940 sim min
facility.textile.04 | Tailor Workshop | Textile & leather | cash fee 142 xc + 26 Timber Beam, 15 Rough Plank, 7 Rope Coil, 7 Canvas Cloth | 3120 sim min
facility.textile.05 | Leather Tannery | Textile & leather | cash fee 248 xc + 28 Timber Beam, 16 Rough Plank, 8 Rope Coil, 8 Canvas Cloth | 3300 sim min
facility.textile.06 | Hide Curing Shed | Textile & leather | cash fee 366 xc + 30 Timber Beam, 17 Rough Plank, 9 Rope Coil, 9 Canvas Cloth | 3480 sim min
facility.textile.07 | Dye House | Textile & leather | cash fee 164 xc + 32 Timber Beam, 18 Rough Plank, 10 Rope Coil, 10 Canvas Cloth | 3660 sim min
facility.textile.08 | Felt Workshop | Textile & leather | cash fee 287 xc + 34 Timber Beam, 19 Rough Plank, 11 Rope Coil, 11 Canvas Cloth | 3840 sim min
facility.textile.09 | Basketry Workshop | Textile & leather | cash fee 420 xc + 36 Timber Beam, 20 Rough Plank, 12 Rope Coil, 12 Canvas Cloth | 4020 sim min
facility.textile.10 | Canvas Workshop | Textile & leather | cash fee 186 xc + 38 Timber Beam, 21 Rough Plank, 13 Rope Coil, 13 Canvas Cloth | 4200 sim min
facility.ceramic.01 | Pottery Workshop | Ceramics & glass | cash fee 135 xc + 20 Fine Clay, 12 Fieldstone, 4 Rough Plank, 4 Firewood Bundle | 2790 sim min
facility.ceramic.02 | Village Kiln | Ceramics & glass | cash fee 238 xc + 22 Fine Clay, 13 Fieldstone, 5 Rough Plank, 5 Firewood Bundle | 2970 sim min
facility.ceramic.03 | Brick Kiln | Ceramics & glass | cash fee 352 xc + 24 Fine Clay, 14 Fieldstone, 6 Rough Plank, 6 Firewood Bundle | 3150 sim min
facility.ceramic.04 | Roof Tile Kiln | Ceramics & glass | cash fee 158 xc + 26 Fine Clay, 15 Fieldstone, 7 Rough Plank, 7 Firewood Bundle | 3330 sim min
facility.ceramic.05 | Glaze Workshop | Ceramics & glass | cash fee 278 xc + 28 Fine Clay, 16 Fieldstone, 8 Rough Plank, 8 Firewood Bundle | 3510 sim min
facility.ceramic.06 | Glassworks | Ceramics & glass | cash fee 410 xc + 30 Fine Clay, 17 Fieldstone, 9 Rough Plank, 9 Firewood Bundle | 3690 sim min
facility.ceramic.07 | Glassblowing Shop | Ceramics & glass | cash fee 181 xc + 32 Fine Clay, 18 Fieldstone, 10 Rough Plank, 10 Firewood Bundle | 3870 sim min
facility.ceramic.08 | Ceramic Firing House | Ceramics & glass | cash fee 319 xc + 34 Fine Clay, 19 Fieldstone, 11 Rough Plank, 11 Firewood Bundle | 4050 sim min
facility.ceramic.09 | Stoneware Kiln | Ceramics & glass | cash fee 468 xc + 36 Fine Clay, 20 Fieldstone, 12 Rough Plank, 12 Firewood Bundle | 4230 sim min
facility.ceramic.10 | Porcelain Studio | Ceramics & glass | cash fee 205 xc + 38 Fine Clay, 21 Fieldstone, 13 Rough Plank, 13 Firewood Bundle | 4410 sim min
facility.medicine.01 | Herb Drying House | Medicine & herbs | cash fee 156 xc + 20 Hardwood Board, 12 Clay Jar, 4 Paper Stack, 4 Water Barrel | 3000 sim min
facility.medicine.02 | Herb Mill | Medicine & herbs | cash fee 279 xc + 22 Hardwood Board, 13 Clay Jar, 5 Paper Stack, 5 Water Barrel | 3180 sim min
facility.medicine.03 | Apothecary Bench | Medicine & herbs | cash fee 415 xc + 24 Hardwood Board, 14 Clay Jar, 6 Paper Stack, 6 Water Barrel | 3360 sim min
facility.medicine.04 | Apothecary Shop | Medicine & herbs | cash fee 182 xc + 26 Hardwood Board, 15 Clay Jar, 7 Paper Stack, 7 Water Barrel | 3540 sim min
facility.medicine.05 | Medicine Hall Clinic | Medicine & herbs | cash fee 324 xc + 28 Hardwood Board, 16 Clay Jar, 8 Paper Stack, 8 Water Barrel | 3720 sim min
facility.medicine.06 | Distillation Room | Medicine & herbs | cash fee 480 xc + 30 Hardwood Board, 17 Clay Jar, 9 Paper Stack, 9 Water Barrel | 3900 sim min
facility.medicine.07 | Herbal Storage Cellar | Medicine & herbs | cash fee 207 xc + 32 Hardwood Board, 18 Clay Jar, 10 Paper Stack, 10 Water Barrel | 4080 sim min
facility.medicine.08 | Poultice Workshop | Medicine & herbs | cash fee 369 xc + 34 Hardwood Board, 19 Clay Jar, 11 Paper Stack, 11 Water Barrel | 4260 sim min
facility.medicine.09 | Incense Workshop | Medicine & herbs | cash fee 544 xc + 36 Hardwood Board, 20 Clay Jar, 12 Paper Stack, 12 Water Barrel | 4440 sim min
facility.medicine.10 | Medicinal Garden | Medicine & herbs | cash fee 233 xc + 38 Hardwood Board, 21 Clay Jar, 13 Paper Stack, 13 Water Barrel | 4620 sim min
facility.craft.01 | Carpentry Workshop | Wood & stone craft | cash fee 141 xc + 20 Pine Log, 12 Rough Plank, 4 Iron Nail Box, 4 Fieldstone | 3210 sim min
facility.craft.02 | Joinery Shop | Wood & stone craft | cash fee 243 xc + 22 Pine Log, 13 Rough Plank, 5 Iron Nail Box, 5 Fieldstone | 3390 sim min
facility.craft.03 | Furniture Workshop | Wood & stone craft | cash fee 355 xc + 24 Pine Log, 14 Rough Plank, 6 Iron Nail Box, 6 Fieldstone | 3570 sim min
facility.craft.04 | Wheelwright Shed | Wood & stone craft | cash fee 162 xc + 26 Pine Log, 15 Rough Plank, 7 Iron Nail Box, 7 Fieldstone | 3750 sim min
facility.craft.05 | Cooperage | Wood & stone craft | cash fee 280 xc + 28 Pine Log, 16 Rough Plank, 8 Iron Nail Box, 8 Fieldstone | 3930 sim min
facility.craft.06 | Mason Yard | Wood & stone craft | cash fee 407 xc + 30 Pine Log, 17 Rough Plank, 9 Iron Nail Box, 9 Fieldstone | 4110 sim min
facility.craft.07 | Stone Carving Studio | Wood & stone craft | cash fee 184 xc + 32 Pine Log, 18 Rough Plank, 10 Iron Nail Box, 10 Fieldstone | 4290 sim min
facility.craft.08 | Roofing Workshop | Wood & stone craft | cash fee 316 xc + 34 Pine Log, 19 Rough Plank, 11 Iron Nail Box, 11 Fieldstone | 4470 sim min
facility.craft.09 | Door & Window Shop | Wood & stone craft | cash fee 458 xc + 36 Pine Log, 20 Rough Plank, 12 Iron Nail Box, 12 Fieldstone | 4650 sim min
facility.craft.10 | Cartwright Workshop | Wood & stone craft | cash fee 205 xc + 38 Pine Log, 21 Rough Plank, 13 Iron Nail Box, 13 Fieldstone | 4830 sim min
facility.storage.01 | Storage Shed | Storage & logistics | cash fee 137 xc + 20 Pine Log, 12 Rough Plank, 4 Roof Thatch Bundle, 4 Fieldstone | 3420 sim min
facility.storage.02 | Granary | Storage & logistics | cash fee 229 xc + 22 Pine Log, 13 Rough Plank, 5 Roof Thatch Bundle, 5 Fieldstone | 3600 sim min
facility.storage.03 | Root Cellar | Storage & logistics | cash fee 331 xc + 24 Pine Log, 14 Rough Plank, 6 Roof Thatch Bundle, 6 Fieldstone | 3780 sim min
facility.storage.04 | Cold Spring Storehouse | Storage & logistics | cash fee 156 xc + 26 Pine Log, 15 Rough Plank, 7 Roof Thatch Bundle, 7 Fieldstone | 3960 sim min
facility.storage.05 | Warehouse | Storage & logistics | cash fee 261 xc + 28 Pine Log, 16 Rough Plank, 8 Roof Thatch Bundle, 8 Fieldstone | 4140 sim min
facility.storage.06 | Dry Goods Store | Storage & logistics | cash fee 376 xc + 30 Pine Log, 17 Rough Plank, 9 Roof Thatch Bundle, 9 Fieldstone | 4320 sim min
facility.storage.07 | Tool Depot | Storage & logistics | cash fee 174 xc + 32 Pine Log, 18 Rough Plank, 10 Roof Thatch Bundle, 10 Fieldstone | 4500 sim min
facility.storage.08 | Seed Vault | Storage & logistics | cash fee 293 xc + 34 Pine Log, 19 Rough Plank, 11 Roof Thatch Bundle, 11 Fieldstone | 4680 sim min
facility.storage.09 | Cold Fish Store | Storage & logistics | cash fee 420 xc + 36 Pine Log, 20 Rough Plank, 12 Roof Thatch Bundle, 12 Fieldstone | 4860 sim min
facility.storage.10 | Market Loading Yard | Storage & logistics | cash fee 193 xc + 38 Pine Log, 21 Rough Plank, 13 Roof Thatch Bundle, 13 Fieldstone | 5040 sim min
facility.trade.01 | Market Stall | Trade & commerce | cash fee 152 xc + 20 Timber Beam, 12 Rough Plank, 4 Canvas Cloth, 4 Iron Nail Box | 3630 sim min
facility.trade.02 | Covered Market Stall | Trade & commerce | cash fee 258 xc + 22 Timber Beam, 13 Rough Plank, 5 Canvas Cloth, 5 Iron Nail Box | 3810 sim min
facility.trade.03 | General Store | Trade & commerce | cash fee 373 xc + 24 Timber Beam, 14 Rough Plank, 6 Canvas Cloth, 6 Iron Nail Box | 3990 sim min
facility.trade.04 | Produce Market | Trade & commerce | cash fee 172 xc + 26 Timber Beam, 15 Rough Plank, 7 Canvas Cloth, 7 Iron Nail Box | 4170 sim min
facility.trade.05 | Fish Market | Trade & commerce | cash fee 292 xc + 28 Timber Beam, 16 Rough Plank, 8 Canvas Cloth, 8 Iron Nail Box | 4350 sim min
facility.trade.06 | Timber Exchange | Trade & commerce | cash fee 421 xc + 30 Timber Beam, 17 Rough Plank, 9 Canvas Cloth, 9 Iron Nail Box | 4530 sim min
facility.trade.07 | Ore Trading Post | Trade & commerce | cash fee 192 xc + 32 Timber Beam, 18 Rough Plank, 10 Canvas Cloth, 10 Iron Nail Box | 4710 sim min
facility.trade.08 | Farmers' Market Hall | Trade & commerce | cash fee 326 xc + 34 Timber Beam, 19 Rough Plank, 11 Canvas Cloth, 11 Iron Nail Box | 4890 sim min
facility.trade.09 | Auction House | Trade & commerce | cash fee 469 xc + 36 Timber Beam, 20 Rough Plank, 12 Canvas Cloth, 12 Iron Nail Box | 5070 sim min
facility.trade.10 | Caravanserai | Trade & commerce | cash fee 212 xc + 38 Timber Beam, 21 Rough Plank, 13 Canvas Cloth, 13 Iron Nail Box | 5250 sim min
facility.transport.01 | Handcart Yard | Transport & public works | cash fee 214 xc + 20 Timber Beam, 12 Fieldstone, 4 Rope Coil, 4 Rough Plank | 3840 sim min
facility.transport.02 | Cartwright Stable | Transport & public works | cash fee 384 xc + 22 Timber Beam, 13 Fieldstone, 5 Rope Coil, 5 Rough Plank | 4020 sim min
facility.transport.03 | Ferry Landing | Transport & public works | cash fee 568 xc + 24 Timber Beam, 14 Fieldstone, 6 Rope Coil, 6 Rough Plank | 4200 sim min
facility.transport.04 | River Jetty | Transport & public works | cash fee 242 xc + 26 Timber Beam, 15 Fieldstone, 7 Rope Coil, 7 Rough Plank | 4380 sim min
facility.transport.05 | Roadside Inn | Transport & public works | cash fee 433 xc + 28 Timber Beam, 16 Fieldstone, 8 Rope Coil, 8 Rough Plank | 4560 sim min
facility.transport.06 | Bridge Workshop | Transport & public works | cash fee 639 xc + 30 Timber Beam, 17 Fieldstone, 9 Rope Coil, 9 Rough Plank | 4740 sim min
facility.transport.07 | Road Maintenance Yard | Transport & public works | cash fee 269 xc + 32 Timber Beam, 18 Fieldstone, 10 Rope Coil, 10 Rough Plank | 4920 sim min
facility.transport.08 | Porter Station | Transport & public works | cash fee 482 xc + 34 Timber Beam, 19 Fieldstone, 11 Rope Coil, 11 Rough Plank | 5100 sim min
facility.transport.09 | Caravan Camp | Transport & public works | cash fee 710 xc + 36 Timber Beam, 20 Fieldstone, 12 Rope Coil, 12 Rough Plank | 5280 sim min
facility.transport.10 | Waystation | Transport & public works | cash fee 297 xc + 38 Timber Beam, 21 Fieldstone, 13 Rope Coil, 13 Rough Plank | 5460 sim min
facility.community.01 | Village Hall | Community & services | cash fee 209 xc + 20 Fieldstone, 12 Rough Plank, 4 Roof Tile Bundle, 4 Timber Beam | 4050 sim min
facility.community.02 | Bathhouse | Community & services | cash fee 370 xc + 22 Fieldstone, 13 Rough Plank, 5 Roof Tile Bundle, 5 Timber Beam | 4230 sim min
facility.community.03 | Public Latrine | Community & services | cash fee 544 xc + 24 Fieldstone, 14 Rough Plank, 6 Roof Tile Bundle, 6 Timber Beam | 4410 sim min
facility.community.04 | Clinic | Community & services | cash fee 235 xc + 26 Fieldstone, 15 Rough Plank, 7 Roof Tile Bundle, 7 Timber Beam | 4590 sim min
facility.community.05 | Schoolhouse | Community & services | cash fee 415 xc + 28 Fieldstone, 16 Rough Plank, 8 Roof Tile Bundle, 8 Timber Beam | 4770 sim min
facility.community.06 | Dojo Training Yard | Community & services | cash fee 608 xc + 30 Fieldstone, 17 Rough Plank, 9 Roof Tile Bundle, 9 Timber Beam | 4950 sim min
facility.community.07 | Notice Hall | Community & services | cash fee 260 xc + 32 Fieldstone, 18 Rough Plank, 10 Roof Tile Bundle, 10 Timber Beam | 5130 sim min
facility.community.08 | Guesthouse | Community & services | cash fee 460 xc + 34 Fieldstone, 19 Rough Plank, 11 Roof Tile Bundle, 11 Timber Beam | 5310 sim min
facility.community.09 | Fire Watch Tower | Community & services | cash fee 672 xc + 36 Fieldstone, 20 Rough Plank, 12 Roof Tile Bundle, 12 Timber Beam | 5490 sim min
facility.community.10 | Night Watch Post | Community & services | cash fee 286 xc + 38 Fieldstone, 21 Rough Plank, 13 Roof Tile Bundle, 13 Timber Beam | 5670 sim min
facility.arcane.01 | Arcanist Study Room | Arcanistry & Artificial Artifact | cash fee 322 xc + 20 Hardwood Board, 12 Copper Fitting, 4 Glass Pane, 4 Steel Plate | 4260 sim min
facility.arcane.02 | Formation Engraver Studio | Arcanistry & Artificial Artifact | cash fee 601 xc + 22 Hardwood Board, 13 Copper Fitting, 5 Glass Pane, 5 Steel Plate | 4440 sim min
facility.arcane.03 | Artificial Artifact Workshop | Arcanistry & Artificial Artifact | cash fee 902 xc + 24 Hardwood Board, 14 Copper Fitting, 6 Glass Pane, 6 Steel Plate | 4620 sim min
facility.arcane.04 | Artifact Testing Chamber | Arcanistry & Artificial Artifact | cash fee 360 xc + 26 Hardwood Board, 15 Copper Fitting, 7 Glass Pane, 7 Steel Plate | 4800 sim min
facility.arcane.05 | Material Assay Room | Arcanistry & Artificial Artifact | cash fee 672 xc + 28 Hardwood Board, 16 Copper Fitting, 8 Glass Pane, 8 Steel Plate | 4980 sim min
facility.arcane.06 | Energy Refining Annex | Arcanistry & Artificial Artifact | cash fee 1005 xc + 30 Hardwood Board, 17 Copper Fitting, 9 Glass Pane, 9 Steel Plate | 5160 sim min
facility.arcane.07 | Formation Calibration Hall | Arcanistry & Artificial Artifact | cash fee 399 xc + 32 Hardwood Board, 18 Copper Fitting, 10 Glass Pane, 10 Steel Plate | 5340 sim min
facility.arcane.08 | Engraver Training Bench | Arcanistry & Artificial Artifact | cash fee 743 xc + 34 Hardwood Board, 19 Copper Fitting, 11 Glass Pane, 11 Steel Plate | 5520 sim min
facility.arcane.09 | Pattern Archive | Arcanistry & Artificial Artifact | cash fee 1108 xc + 36 Hardwood Board, 20 Copper Fitting, 12 Glass Pane, 12 Steel Plate | 5700 sim min
facility.arcane.10 | Institute Research Laboratory | Arcanistry & Artificial Artifact | cash fee 437 xc + 38 Hardwood Board, 21 Copper Fitting, 13 Glass Pane, 13 Steel Plate | 5880 sim min
facility.specialty.01 | Saltworks | Specialty & rural industries | cash fee 195 xc + 20 Fieldstone, 12 Clay Brick, 4 Timber Beam, 4 Firewood Bundle | 4470 sim min
facility.specialty.02 | Charcoal Refinery | Specialty & rural industries | cash fee 332 xc + 22 Fieldstone, 13 Clay Brick, 5 Timber Beam, 5 Firewood Bundle | 4650 sim min
facility.specialty.03 | Limeworks | Specialty & rural industries | cash fee 479 xc + 24 Fieldstone, 14 Clay Brick, 6 Timber Beam, 6 Firewood Bundle | 4830 sim min
facility.specialty.04 | Brickworks | Specialty & rural industries | cash fee 216 xc + 26 Fieldstone, 15 Clay Brick, 7 Timber Beam, 7 Firewood Bundle | 5010 sim min
facility.specialty.05 | Paper Mill | Specialty & rural industries | cash fee 368 xc + 28 Fieldstone, 16 Clay Brick, 8 Timber Beam, 8 Firewood Bundle | 5190 sim min
facility.specialty.06 | Inkworks | Specialty & rural industries | cash fee 531 xc + 30 Fieldstone, 17 Clay Brick, 9 Timber Beam, 9 Firewood Bundle | 5370 sim min
facility.specialty.07 | Soapworks | Specialty & rural industries | cash fee 237 xc + 32 Fieldstone, 18 Clay Brick, 10 Timber Beam, 10 Firewood Bundle | 5550 sim min
facility.specialty.08 | Candleworks | Specialty & rural industries | cash fee 404 xc + 34 Fieldstone, 19 Clay Brick, 11 Timber Beam, 11 Firewood Bundle | 5730 sim min
facility.specialty.09 | Compost Yard | Specialty & rural industries | cash fee 582 xc + 36 Fieldstone, 20 Clay Brick, 12 Timber Beam, 12 Firewood Bundle | 5910 sim min
facility.specialty.10 | Fertilizer Shed | Specialty & rural industries | cash fee 258 xc + 38 Fieldstone, 21 Clay Brick, 13 Timber Beam, 13 Firewood Bundle | 6090 sim min
