// Seed demo data for the US version (MySQL / Sequelize)
// Run: node seed-us-demo.js
require('dotenv').config();
const { sequelize, Admin, DriverPost, FakeNotification, WaitingRequest, AppSetting } = require('./src/models');

const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

async function seed() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('DB connected & synced');

    // 1) Admin
    let admin = await Admin.findOne({ where: { username: 'admin' } });
    if (!admin) {
      admin = await Admin.create({ username: 'admin', password: 'admin123', role: 'super_admin' });
      console.log('Created admin: admin / admin123');
    } else {
      console.log('Admin already exists');
    }

    // 2) App settings
    let settings = await AppSetting.findOne();
    if (!settings) {
      settings = await AppSetting.create({
        minFakeCount: 3, maxFakeCount: 4, minFakeInterval: 15, maxFakeInterval: 30,
        paypalMe: 'YOURPAYPALID'
      });
      console.log('Created AppSetting');
    }

    // 3) Driver posts (US) — north=Northeast, central=South, south=West
    const drivers = [
      { name: 'John Davis', phone: '2125551234', route: 'New York <-> Boston', region: 'north' },
      { name: 'Sarah Johnson', phone: '6175552345', route: 'Boston <-> Providence', region: 'north' },
      { name: 'Mike Wilson', phone: '2155553456', route: 'Philadelphia <-> Pittsburgh', region: 'north' },
      { name: 'Emily Garcia', phone: '4105555678', route: 'Baltimore <-> Washington DC', region: 'north' },
      { name: 'James Taylor', phone: '3055551234', route: 'Miami <-> Orlando', region: 'central' },
      { name: 'Jennifer Moore', phone: '7135552345', route: 'Houston <-> Dallas', region: 'central' },
      { name: 'Charles Martin', phone: '4045555678', route: 'Atlanta <-> Charlotte', region: 'central' },
      { name: 'Kevin King', phone: '2135551234', route: 'Los Angeles <-> San Diego', region: 'south' },
      { name: 'Jason Lopez', phone: '7025553456', route: 'Las Vegas <-> Phoenix', region: 'south' },
      { name: 'Timothy Nelson', phone: '4155559012', route: 'San Francisco <-> Sacramento', region: 'south' },
    ];
    const driverCount = await DriverPost.count();
    if (driverCount === 0) {
      await DriverPost.bulkCreate(drivers);
      console.log(`Created ${drivers.length} driver posts`);
    } else {
      console.log(`Driver posts already exist (${driverCount})`);
    }

    // 4) Fake notifications (US, USD, English) across regions
    const fakes = [
      // Northeast
      { region: 'north', startPoint: 'New York', endPoint: 'Boston', startDetail: 'Times Square (Manhattan)', endDetail: 'Logan Airport (Boston)', startArea: 'Manhattan, NY', endArea: 'Boston, MA', displayTime: '08:00', displayDate: today, carType: '7', price: 180, note: 'Pick up at 8am, 4 passengers + luggage. Call (212) 555-0132.' },
      { region: 'north', startPoint: 'Philadelphia', endPoint: 'New York', startDetail: 'Center City (Philadelphia)', endDetail: 'Penn Station (NYC)', startArea: 'Philadelphia, PA', endArea: 'New York, NY', displayTime: '09:30', displayDate: today, carType: '4', price: 95, note: 'Business trip, must arrive by noon.' },
      { region: 'north', startPoint: 'Boston', endPoint: 'Providence', startDetail: 'Back Bay (Boston)', endDetail: 'Downtown Providence', startArea: 'Boston, MA', endArea: 'Providence, RI', displayTime: '14:00', displayDate: today, carType: '7', price: 75, note: 'Round trip same day.' },
      { region: 'north', startPoint: 'Baltimore', endPoint: 'Washington DC', startDetail: 'Inner Harbor (Baltimore)', endDetail: 'Union Station (DC)', startArea: 'Baltimore, MD', endArea: 'Washington, DC', displayTime: '07:15', displayDate: today, carType: '4', price: 60, note: 'Early pickup, careful driver preferred.' },
      // South
      { region: 'central', startPoint: 'Miami', endPoint: 'Orlando', startDetail: 'South Beach (Miami)', endDetail: 'Disney area (Orlando)', startArea: 'Miami, FL', endArea: 'Orlando, FL', displayTime: '10:00', displayDate: today, carType: '7', price: 150, note: 'Family with children, need car seats.' },
      { region: 'central', startPoint: 'Dallas', endPoint: 'Houston', startDetail: 'Downtown Dallas', endDetail: 'Galleria (Houston)', startArea: 'Dallas, TX', endArea: 'Houston, TX', displayTime: '13:30', displayDate: today, carType: '4', price: 120, note: 'Highway route, good AC.' },
      { region: 'central', startPoint: 'Atlanta', endPoint: 'Charlotte', startDetail: 'Midtown Atlanta', endDetail: 'Uptown Charlotte', startArea: 'Atlanta, GA', endArea: 'Charlotte, NC', displayTime: '16:00', displayDate: today, carType: '7', price: 140, note: 'Available until 8pm.' },
      // West
      { region: 'south', startPoint: 'Los Angeles', endPoint: 'San Diego', startDetail: 'Downtown LA', endDetail: 'Gaslamp Quarter (San Diego)', startArea: 'Los Angeles, CA', endArea: 'San Diego, CA', displayTime: '11:00', displayDate: today, carType: '4', price: 110, note: 'Experienced driver preferred.' },
      { region: 'south', startPoint: 'Las Vegas', endPoint: 'Phoenix', startDetail: 'The Strip (Las Vegas)', endDetail: 'Downtown Phoenix', startArea: 'Las Vegas, NV', endArea: 'Phoenix, AZ', displayTime: '06:00', displayDate: today, carType: '7', price: 130, note: 'Early morning departure.' },
      { region: 'south', startPoint: 'San Francisco', endPoint: 'Sacramento', startDetail: 'Union Square (SF)', endDetail: 'Midtown Sacramento', startArea: 'San Francisco, CA', endArea: 'Sacramento, CA', displayTime: '15:30', displayDate: today, carType: '4', price: 90, note: 'One large suitcase.' },
    ];
    const fakeCount = await FakeNotification.count();
    if (fakeCount === 0) {
      await FakeNotification.bulkCreate(fakes.map(f => ({ ...f, isActive: true, createdById: admin.id })));
      console.log(`Created ${fakes.length} fake notifications`);
    } else {
      console.log(`Fake notifications already exist (${fakeCount})`);
    }

    // 5) Waiting requests (US, USD) — status 'waiting'
    const requests = [
      { region: 'north', name: 'Megan Lopez', phone: '2125557788', startPoint: 'New York', endPoint: 'Boston', price: 175, note: 'Need car ASAP, 4 seats.' },
      { region: 'north', name: 'Robert Clark', phone: '6175551122', startPoint: 'Boston', endPoint: 'New York', price: 180, note: '7-seat van, heavy luggage.' },
      { region: 'north', name: 'Lisa Anderson', phone: '2155553344', startPoint: 'Philadelphia', endPoint: 'New York', price: 95, note: 'Business trip, must be on time.' },
      { region: 'central', name: 'David Anderson', phone: '3055559900', startPoint: 'Miami', endPoint: 'Orlando', price: 150, note: 'Children traveling.' },
      { region: 'central', name: 'Ashley Lewis', phone: '7135554455', startPoint: 'Houston', endPoint: 'Dallas', price: 120, note: 'Same-day round trip.' },
      { region: 'south', name: 'Daniel Clark', phone: '2135556677', startPoint: 'Los Angeles', endPoint: 'San Diego', price: 110, note: 'Careful driver needed.' },
      { region: 'south', name: 'Jessica Carter', phone: '7025558899', startPoint: 'Las Vegas', endPoint: 'Phoenix', price: 130, note: 'Available until 8pm.' },
    ];
    const reqCount = await WaitingRequest.count();
    if (reqCount === 0) {
      await WaitingRequest.bulkCreate(requests.map(r => ({ ...r, status: 'waiting' })));
      console.log(`Created ${requests.length} waiting requests`);
    } else {
      console.log(`Waiting requests already exist (${reqCount})`);
    }

    console.log('\n✅ US demo seed completed.');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
