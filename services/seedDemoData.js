import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import MenuItem from '../models/MenuItem.js';
import DeliveryPersonnel from '../models/DeliveryPersonnel.js';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'demo12345';

const IMAGES = {
  jollof: 'https://upload.wikimedia.org/wikipedia/commons/f/f4/A_plate_of_jollof_rice_and_chicken.jpg',
  jollofPot: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Jollof_rice_20th_April_2025.jpg',
  jollofPlates: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Plates_of_Jollof_Rice%2C_Fried_Rice_and_Chicken.jpg',
  suya: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/SuyavarietiesTX.JPG',
  grilling: 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Suya_preparation_for_grilling_5.jpg',
  egusi: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Egusi_soup_in_a_plate.jpg',
  swallow: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Egusi_soup_with_pounded_yam_and_assorted_meats.jpg',
  puffPuff: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Puff_Puff.jpg',
}

const DEMO_RESTAURANTS = [
  {
    owner: { name: 'Amaka Obi', email: 'amaka@dashbite.demo', phone: '+2348012345678' },
    vendor: {
      businessName: "Mama Amaka's Kitchen",
      description: 'Smoky party jollof, hearty soups and fresh swallows, cooked the Lagos way.',
      address: { street: '12 Adeola Odeku Street', city: 'Lagos', state: 'Lagos', zipCode: '101241' },
      minOrderAmount: 2000,
      commissionRate: 12,
      estimatedPrepTimeMinutes: 25,
      ratingsAverage: 4.7,
      ratingsCount: 214,
    },
    items: [
      { name: 'Smoky Party Jollof Rice', price: 3500, description: 'Firewood-smoked jollof served with fried plantain.', imageUrl: IMAGES.jollof },
      { name: 'Fried Rice & Grilled Chicken', price: 4800, description: 'Veggie-loaded fried rice with a grilled chicken quarter.', imageUrl: IMAGES.jollofPlates },
      { name: 'Ofada Rice & Ayamase', price: 4200, description: 'Local ofada rice with green pepper sauce.', imageUrl: IMAGES.jollofPot, spicyLevel: 2 },
      { name: 'Egusi Soup with Assorted Meat', price: 4800, description: 'Melon seed soup cooked with assorted meat and fish.', imageUrl: IMAGES.egusi },
      { name: 'Ogbono Soup with Goat Meat', price: 4500, description: 'Draw soup with tender goat meat.', imageUrl: IMAGES.swallow, spicyLevel: 1 },
      { name: 'Pounded Yam (Wrap)', price: 1500, description: 'Smooth, stretchy pounded yam — perfect with any soup.', imageUrl: IMAGES.swallow },
      { name: 'Semo (Wrap)', price: 1200, description: 'Light semolina swallow for your favourite soup.', imageUrl: IMAGES.swallow },
      { name: 'Chilled Zobo Drink (50cl)', price: 800, description: 'Hibiscus infusion with ginger and pineapple.', isVegetarian: true },
      { name: 'Chapman (50cl)', price: 1200, description: 'Fanta, blackcurrant and bitters served over ice.', isVegetarian: true },
    ],
  },
  {
    owner: { name: 'Tunde Bakare', email: 'tunde@dashbite.demo', phone: '+2348023456789' },
    vendor: {
      businessName: 'Suya Junction',
      description: 'Yaji-spiced suya straight off the grill, plus small chops and cold drinks.',
      address: { street: '24 Allen Avenue', city: 'Lagos', state: 'Lagos', zipCode: '101233' },
      minOrderAmount: 2500,
      commissionRate: 5,
      estimatedPrepTimeMinutes: 20,
      ratingsAverage: 4.8,
      ratingsCount: 187,
    },
    items: [
      { name: 'Beef Suya Skewers', price: 3000, description: 'Yaji-rubbed beef with onions and extra pepper.', imageUrl: IMAGES.suya, spicyLevel: 2 },
      { name: 'Chicken Suya Skewers', price: 2800, description: 'Boneless chicken thigh in suya spice.', imageUrl: IMAGES.suya, spicyLevel: 1 },
      { name: 'Ram Suya (Special)', price: 4500, description: 'Premium ram suya for real suya lovers.', imageUrl: IMAGES.grilling, spicyLevel: 2 },
      { name: 'Grilled Croaker Fish', price: 6500, description: 'Whole croaker grilled with pepper sauce and plantain.', imageUrl: IMAGES.grilling, spicyLevel: 1 },
      { name: 'Grilled Chicken Quarter', price: 3800, description: 'Marinated overnight and flame-grilled.', imageUrl: IMAGES.grilling },
      { name: 'Puff Puff (10 Pieces)', price: 1500, description: 'Golden, fluffy Nigerian doughnuts.', imageUrl: IMAGES.puffPuff, isVegetarian: true },
      { name: 'Small Chops Platter', price: 3500, description: 'Puff puff, samosa, spring rolls and gizdodo.', imageUrl: IMAGES.puffPuff },
      { name: 'Meat Pie (2 Pieces)', price: 1200, description: 'Buttery pastry packed with minced beef and potato.' },
    ],
  },
];

const seedDemoData = async () => {
  const vendorCount = await Vendor.estimatedDocumentCount();
  if (vendorCount === 0) {
    for (const demo of DEMO_RESTAURANTS) {
      let owner = await User.findOne({ email: demo.owner.email });
      if (!owner) {
        owner = await User.create({ ...demo.owner, password: DEMO_PASSWORD, role: 'vendor', isVerified: true });
      }
      const vendor = await Vendor.create({ ...demo.vendor, owner: owner._id, approvalStatus: 'approved', isOpen: true });
      const items = await MenuItem.insertMany(
        demo.items.map((item) => ({ ...item, vendor: vendor._id, approvalStatus: 'approved', isAvailable: true })),
      );
      vendor.menuItems = items.map((item) => item._id);
      await vendor.save();
      console.log(`Demo restaurant "${vendor.businessName}" seeded with ${items.length} menu items.`);
    }
  }

  const demoCourier = await User.findOne({ email: 'emeka.rider@dashbite.demo' });
  if (demoCourier) {
    await DeliveryPersonnel.deleteMany({ user: demoCourier._id });
    await User.deleteOne({ _id: demoCourier._id });
    console.log('Removed demo delivery partner.');
  }
};

export default seedDemoData;