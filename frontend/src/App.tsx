import { useState, useEffect, Component, useRef } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import './App.css'
import { authAPI, driversAPI, requestsAPI, driverAPI, bankConfigAPI } from './services/api'
import AdminLogin from './components/admin/Login'
import AdminDashboard from './components/admin/Dashboard'
import DriverDashboard from './components/driver/DriverDashboard'
import FakeNotificationBanner from './components/driver/FakeNotificationBanner'
import AppPricingModal from './components/driver/AppPricingModal'
import DownloadAppPage from './components/driver/DownloadAppPage'
import LoginWelcomeModal from './components/driver/LoginWelcomeModal'
import { Joyride, STATUS, EVENTS } from 'react-joyride'
import type { Step } from 'react-joyride'

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error?: Error }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p>Please reload the page or try again later.</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Avatar images from folder; we will deterministically map driver+region to an image
const avatarModules = import.meta.glob('../driver/*.{jpg,jpeg,png}', { eager: true }) as Record<string, any>
const avatarImages: string[] = Object.values(avatarModules).map((m: any) => m.default || m)

type Region = 'north' | 'central' | 'south'

type DriverPost = {
  _id: string
  name: string
  phone: string
  route: string
  avatar?: string
  region?: Region
  isActive: boolean
  createdAt: string
}

type User = {
  _id: string
  name: string
  phone: string
  carType: string
  carYear: string
  carImage?: string
  status: 'pending' | 'approved' | 'rejected'
}

const fallbackDriversTuples: Array<[string, string, string, string, Region]> = [
  // Northeast
  ['northeast-1', 'John Davis', '2125551234', 'New York <-> Boston', 'north'],
  ['northeast-2', 'Sarah Johnson', '6175552345', 'New York <-> Philadelphia', 'north'],
  ['northeast-3', 'Mike Wilson', '6175553456', 'Boston <-> Providence', 'north'],
  ['northeast-4', 'Chris Brown', '2035554567', 'New York <-> Hartford', 'north'],
  ['northeast-5', 'Emily Garcia', '4105555678', 'Baltimore <-> Washington DC', 'north'],
  ['northeast-6', 'David Martinez', '5185556789', 'New York <-> Albany', 'north'],
  ['northeast-7', 'Lisa Anderson', '2155557890', 'Philadelphia <-> Pittsburgh', 'north'],
  ['northeast-8', 'Tom Thompson', '6035558901', 'Boston <-> Manchester', 'north'],
  ['northeast-9', 'Amy Jackson', '9735559012', 'New York <-> Newark', 'north'],
  ['northeast-10', 'Ryan White', '4015550123', 'Providence <-> Hartford', 'north'],
  ['northeast-11', 'Brian Harris', '5185551235', 'Albany <-> Syracuse', 'north'],
  ['northeast-12', 'Karen Lewis', '2155552346', 'Philadelphia <-> Trenton', 'north'],
  ['northeast-13', 'Robert Clark', '2075553457', 'Boston <-> Portland ME', 'north'],
  ['northeast-14', 'Maria Rodriguez', '2035554568', 'New York <-> Stamford', 'north'],

  // South
  ['south-1', 'James Taylor', '3055551234', 'Miami <-> Atlanta', 'central'],
  ['south-2', 'Jennifer Moore', '7135552345', 'Houston <-> Dallas', 'central'],
  ['south-3', 'William Jackson', '6155553456', 'Nashville <-> Charlotte', 'central'],
  ['south-4', 'Patricia Thomas', '5045554567', 'New Orleans <-> Baton Rouge', 'central'],
  ['south-5', 'Charles Martin', '4045555678', 'Atlanta <-> Charlotte', 'central'],
  ['south-6', 'Linda Walker', '5125556789', 'Dallas <-> Austin', 'central'],
  ['south-7', 'Mark Hall', '8135557890', 'Miami <-> Tampa', 'central'],
  ['south-8', 'Barbara Allen', '9015558901', 'Memphis <-> Nashville', 'central'],
  ['south-9', 'Steven Young', '2105559012', 'Houston <-> San Antonio', 'central'],
  ['south-10', 'Susan Hernandez', '2055550123', 'Atlanta <-> Birmingham', 'central'],

  // West
  ['west-1', 'Kevin King', '2135551234', 'Los Angeles <-> San Francisco', 'south'],
  ['west-2', 'Nancy Wright', '2065552345', 'Seattle <-> Portland', 'south'],
  ['west-3', 'Jason Lopez', '7025553456', 'Las Vegas <-> Phoenix', 'south'],
  ['west-4', 'Helen Hill', '3035554567', 'Denver <-> Salt Lake City', 'south'],
  ['west-5', 'Ryan Scott', '6195555678', 'Los Angeles <-> San Diego', 'south'],
  ['west-6', 'Donna Green', '5035556789', 'Portland <-> Eugene', 'south'],
  ['west-7', 'Eric Adams', '6025557890', 'Phoenix <-> Tucson', 'south'],
  ['west-8', 'Carol Baker', '5095558901', 'Seattle <-> Spokane', 'south'],
  ['west-9', 'Timothy Nelson', '4155559012', 'San Francisco <-> Sacramento', 'south'],
  ['west-10', 'Jessica Carter', '2135550124', 'Los Angeles <-> Las Vegas', 'south'],
];

function generatePhone(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  const prefix = (hash % 2 === 0) ? '09' : '07'
  const body = (hash % 100000000).toString().padStart(8, '0')
  return prefix + body
}

const posts: DriverPost[] = fallbackDriversTuples.map(([id, name, phone, route, region]) => ({
  _id: id,
  name,
  phone: generatePhone(`${id}-${name}-${phone}`),
  route,
  region,
  isActive: true,
  createdAt: new Date().toISOString(),
}))

const fallbackDriversByRegion: Record<Region, DriverPost[]> = posts.reduce((acc, driver) => {
  const region = (driver.region ?? 'north') as Region
  if (!acc[region]) {
    acc[region] = []
  }
  acc[region].push(driver)
  return acc
}, { north: [], central: [], south: [] } as Record<Region, DriverPost[]>)

const regionLabels: Record<Region, string> = {
  north: 'Northeast',
  central: 'South',
  south: 'West',
}

const provincesVN63 = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
  'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
  'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
]

// US states grouped by region
const provincesByRegion: Record<Region, string[]> = {
  north: [ // Northeast
    'Connecticut', 'Delaware', 'Maine', 'Maryland', 'Massachusetts',
    'New Hampshire', 'New Jersey', 'New York', 'Pennsylvania', 'Rhode Island',
    'Vermont'
  ],
  central: [ // South
    'Alabama', 'Arkansas', 'Florida', 'Georgia', 'Kentucky',
    'Louisiana', 'Mississippi', 'North Carolina', 'Oklahoma', 'South Carolina',
    'Tennessee', 'Texas', 'Virginia', 'West Virginia'
  ],
  south: [ // West
    'Alaska', 'Arizona', 'California', 'Colorado', 'Hawaii',
    'Idaho', 'Montana', 'Nevada', 'New Mexico', 'Oregon',
    'Utah', 'Washington', 'Wyoming'
  ]
}

// Hàm xác định miền từ tên tỉnh thành
function getRegionFromProvince(province: string): Region | null {
  for (const [region, provinces] of Object.entries(provincesByRegion)) {
    if (provinces.includes(province)) {
      return region as Region
    }
  }
  return null
}

//

function maskPhoneStrict(phone: string): string {
  // Hiển thị 3 đầu số + xxxx + 3 cuối số
  if (phone.length >= 10) {
    const first3 = phone.slice(0, 3)
    const last3 = phone.slice(-3)
    return `${first3} xxxx ${last3}`
  }
  return phone
}

//

// Admin App Component
function AdminApp() {
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if admin is already logged in
    const token = localStorage.getItem('admin_token');
    const adminData = localStorage.getItem('admin_user');

    if (token && adminData) {
      try {
        setAdmin(JSON.parse(adminData));
      } catch (error) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (adminData: any) => {
    setAdmin(adminData);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setAdmin(null);
    // Redirect to admin login page
    window.location.href = '/admin';
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {admin ? (
        <AdminDashboard admin={admin} onLogout={handleLogout} />
      ) : (
        <AdminLogin onLogin={handleLogin} />
      )}
    </div>
  );
}

// Main App Component
function MainApp() {
  // Handle uncaught promise rejections
  const seedingRef = useRef(false)
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Uncaught Promise Rejection:', event.reason);
      event.preventDefault(); // Prevent the default browser behavior

      // Show user-friendly error message
      setErrorMessage('Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Helper function để tạo cuốc xe ảo - expose ra window để gọi từ console (DEV only)
    const isDev = import.meta.env.DEV
    const randomPhone = () => {
      const prefixes = ['09', '08', '07', '03']
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
      const body = Math.floor(1_000_0000 + Math.random() * 8_999_9999).toString() // 8 digits
      return `${prefix}${body}` // 10 digits
    }
    const randomPrice = (min: number = 25, max: number = 150) => {
      const value = min + Math.random() * (max - min)
      return Math.round(value) // làm tròn nghìn cho “thật”
    }
    const randomNote = (notes: string[]) => notes[Math.floor(Math.random() * notes.length)]

    // Priority destinations to generate realistic routes
    const provincePreferredDestinations: Record<string, string[]> = {
      'New York': ['New Jersey', 'Connecticut', 'Pennsylvania', 'Massachusetts', 'Rhode Island', 'Delaware', 'Maryland'],
      'Texas': ['Oklahoma', 'Louisiana', 'Arkansas'],
      'California': ['Nevada', 'Oregon', 'Arizona'],
      'Florida': ['Georgia', 'Alabama', 'South Carolina'],
      'Washington': ['Oregon', 'Idaho', 'Montana'],
    }

    // Reference price ranges by route (min, max) in USD
    const provincePriceRanges: Record<string, Record<string, [number, number]>> = {
      'New York': {
        'New Jersey': [30, 50],
        'Connecticut': [45, 65],
        'Pennsylvania': [55, 80],
        'Massachusetts': [85, 110],
        'Delaware': [65, 85],
        'Maryland': [75, 95],
        'Rhode Island': [95, 120],
        'Vermont': [110, 140],
        'New Hampshire': [120, 150],
        'Maine': [150, 180],
      },
      'California': {
        'Nevada': [70, 100],
        'Oregon': [90, 130],
        'Arizona': [80, 110],
      },
      'Texas': {
        'Oklahoma': [80, 110],
        'Louisiana': [75, 105],
        'Arkansas': [85, 115],
      },
    }

    const getPriceRange = (origin: string, destination: string, fallbackMin: number, fallbackMax: number): [number, number] => {
      const fromMap = provincePriceRanges[origin]?.[destination]
      if (fromMap) return fromMap
      return [fallbackMin, fallbackMax]
    }

    const createFakeRequests = async (options?: { perProvince?: number; delayMs?: number }) => {
      if (!isDev) {
        console.warn('createFakeRequests is DEV-only')
        return { successCount: 0, errorCount: 0, total: 0 }
      }
      if (seedingRef.current) {
        console.warn('Seeding already running, please wait...')
        return { successCount: 0, errorCount: 0, total: 0 }
      }
      seedingRef.current = true
      const perProvince = options?.perProvince ?? 100
      const delayMs = options?.delayMs ?? 10

      const fakeNames = [
        'James Wilson', 'Sarah Johnson', 'Michael Davis', 'Emily Brown',
        'Robert Garcia', 'Jennifer Martinez', 'David Anderson', 'Lisa Thomas',
        'Christopher Jackson', 'Amanda White', 'Matthew Harris', 'Ashley Lewis',
        'Daniel Clark', 'Jessica Robinson', 'Andrew Thompson', 'Stephanie Lee'
      ]

      const notes = [
        'Need car ASAP, 4 seats', '7-seat van, heavy luggage', 'Early pickup at 6am',
        'Experienced driver preferred', 'Same-day round trip', 'Available until 8pm',
        'New model car, good AC', 'Highway route needed', 'Children traveling',
        'Careful driver needed', 'Business trip, must be on time', 'Elderly passenger'
      ]

      const requests: Array<{ name: string, phone: string, startPoint: string, endPoint: string, price: number, note: string, region: Region }> = []

      // Generate requests for each region
      for (const [region, provinces] of Object.entries(provincesByRegion)) {
        const regionType = region as Region

        // Generate N requests per state
        provinces.forEach((province, idx) => {
          const preferred = provincePreferredDestinations[province] || []
          const destinationsPool = preferred.length ? preferred : provinces
          const destinations = destinationsPool.filter(p => p !== province)
          const isShort = preferred.length > 0
          const defaultMin = isShort ? 25 : 60
          const defaultMax = isShort ? 80 : 180

          for (let i = 0; i < perProvince; i++) {
            // Chọn destination ngẫu nhiên từ danh sách tỉnh trong cùng miền
            const randomDest = destinations[Math.floor(Math.random() * destinations.length)]

            if (randomDest) {
              const nameIdx = (idx * perProvince + i) % fakeNames.length
              const phone = randomPhone()
              const note = randomNote(notes)
              const [routeMin, routeMax] = getPriceRange(province, randomDest, defaultMin, defaultMax)
              const price = randomPrice(routeMin, routeMax)

              requests.push({
                name: fakeNames[nameIdx],
                phone,
                startPoint: province,
                endPoint: randomDest,
                price,
                note,
                region: regionType
              })
            }
          }
        })
      }

      console.log(`🚀 Creating ${requests.length} fake rides (~${perProvince} per state, delay ${delayMs}ms)...`)

      // Tạo requests với delay để tránh quá tải server
      let successCount = 0
      let errorCount = 0

      try {
        for (let i = 0; i < requests.length; i++) {
          try {
            await requestsAPI.createRequest(requests[i])
            successCount++
            console.log(`✓ [${i + 1}/${requests.length}] ${requests[i].startPoint} -> ${requests[i].endPoint}`)

            // Delay between requests
            if (i < requests.length - 1) {
              await new Promise(resolve => setTimeout(resolve, delayMs))
            }
          } catch (error) {
            errorCount++
            console.error(`✗ Lỗi: ${requests[i].startPoint} -> ${requests[i].endPoint}`, error)
          }
        }

        console.log(`\n✅ Done! Created: ${successCount}/${requests.length}`)
        if (errorCount > 0) {
          console.log(`⚠️ ${errorCount} errors`)
        }

        // Reload requests after seeding
        try {
          const res = await requestsAPI.getAllRequests({ status: 'waiting' })
          const list = Array.isArray(res.data?.requests) ? res.data.requests : []
          list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          console.log(`📋 Reloaded ${list.length} requests`)
        } catch (e) {
          console.error('Error reloading requests', e)
        }

        return { successCount, errorCount, total: requests.length }
      } finally {
        seedingRef.current = false
      }
    }

    // Helper: create fake rides for 1 specific state and save to server
    const createProvinceRequests = async (province: string, options?: { count?: number; delayMs?: number }) => {
      if (!isDev) {
        console.warn('createProvinceRequests is DEV-only')
        return { total: 0, successCount: 0, errorCount: 0 }
      }
      if (seedingRef.current) {
        console.warn('Seeding already running, please wait...')
        return { total: 0, successCount: 0, errorCount: 0 }
      }
      seedingRef.current = true
      const count = options?.count ?? 20
      const delayMs = options?.delayMs ?? 20
      const region = getRegionFromProvince(province)
      if (!region) {
        console.warn('Could not determine region for state:', province)
        return { total: 0, successCount: 0, errorCount: 0 }
      }

      const provinces = provincesByRegion[region] || []
      const preferred = provincePreferredDestinations[province] || []
      const destinationsPool = preferred.length ? preferred : provinces
      const destinations = destinationsPool.filter((p) => p !== province)
      if (destinations.length === 0) {
        console.warn('No valid destinations in same region for state:', province)
        return { total: 0, successCount: 0, errorCount: 0 }
      }

      const fakeNames = [
        'James Wilson', 'Sarah Johnson', 'Michael Davis', 'Emily Brown',
        'Robert Garcia', 'Jennifer Martinez', 'David Anderson', 'Lisa Thomas',
        'Christopher Jackson', 'Amanda White', 'Matthew Harris', 'Ashley Lewis',
        'Daniel Clark', 'Jessica Robinson', 'Andrew Thompson', 'Stephanie Lee'
      ]
      const notes = [
        'Need car ASAP, 4 seats', '7-seat van, heavy luggage', 'Early pickup at 6am',
        'Experienced driver preferred', 'Same-day round trip', 'Available until 8pm',
        'New model car, good AC', 'Highway route needed', 'Children traveling',
        'Careful driver needed', 'Business trip, must be on time', 'Elderly passenger'
      ]
      const isShort = preferred.length > 0
      const defaultMin = isShort ? 25 : 60
      const defaultMax = isShort ? 80 : 180
      console.log(`🚀 Creating ${count} fake rides for ${province} (server), delay ${delayMs}ms... Priority destinations: ${destinations.slice(0, 6).join(', ')}`)

      let successCount = 0
      let errorCount = 0

      try {
        for (let i = 0; i < count; i++) {
          const randomDest = destinations[Math.floor(Math.random() * destinations.length)]
          const nameIdx = i % fakeNames.length
          const phone = randomPhone()
          const note = randomNote(notes)
          const [routeMin, routeMax] = getPriceRange(province, randomDest, defaultMin, defaultMax)
          const price = randomPrice(routeMin, routeMax)

          const payload = {
            name: fakeNames[nameIdx],
            phone,
            startPoint: province,
            endPoint: randomDest,
            price,
            note,
            region,
          }

          try {
            await requestsAPI.createRequest(payload)
            successCount++
            console.log(`✓ [${i + 1}/${count}] ${province} -> ${randomDest}`)
            if (i < count - 1) {
              await new Promise((resolve) => setTimeout(resolve, delayMs))
            }
          } catch (error) {
            errorCount++
            console.error(`✗ Error: ${province} -> ${randomDest}`, error)
          }
        }

        console.log(`✅ Done ${province}: ${successCount}/${count} rides`)

        try {
          const res = await requestsAPI.getAllRequests({ status: 'waiting' })
          const list = Array.isArray(res.data?.requests) ? res.data.requests : []
          list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          setRequests(list)
          console.log(`📋 Reloaded requests: ${list.length}`)
        } catch (e) {
          console.error('Error reloading requests', e)
        }

        return { total: count, successCount, errorCount }
      } finally {
        seedingRef.current = false
      }
    }

    // Helper: seed fake data into state (no API call, local display only)
    const seedLocalFakeRequests = (options?: { perProvince?: number }) => {
      const perProvince = options?.perProvince ?? 100

      const fakeNames = [
        'James Wilson', 'Sarah Johnson', 'Michael Davis', 'Emily Brown',
        'Robert Garcia', 'Jennifer Martinez', 'David Anderson', 'Lisa Thomas',
        'Christopher Jackson', 'Amanda White', 'Matthew Harris', 'Ashley Lewis',
        'Daniel Clark', 'Jessica Robinson', 'Andrew Thompson', 'Stephanie Lee'
      ]
      const notes = [
        'Need car ASAP, 4 seats', '7-seat van, heavy luggage', 'Early pickup at 6am',
        'Experienced driver preferred', 'Same-day round trip', 'Available until 8pm',
        'New model car, good AC', 'Highway route needed', 'Children traveling',
        'Careful driver needed', 'Business trip, must be on time', 'Elderly passenger'
      ]

      const localRequests: Array<{ _id: string; name: string; phone: string; startPoint: string; endPoint: string; price: number; createdAt: string; note?: string; region?: Region }> = []

      for (const [region, provinces] of Object.entries(provincesByRegion)) {
        const regionType = region as Region
        provinces.forEach((province, idx) => {
          const preferred = provincePreferredDestinations[province] || []
          const destinationsPool = preferred.length ? preferred : provinces
          const destinations = destinationsPool.filter((p) => p !== province)
          const isShort = preferred.length > 0
          const defaultMin = isShort ? 25 : 60
          const defaultMax = isShort ? 80 : 180
          for (let i = 0; i < perProvince; i++) {
            const randomDest = destinations[Math.floor(Math.random() * destinations.length)]
            if (!randomDest) continue

            const nameIdx = (idx * perProvince + i) % fakeNames.length
            const phone = randomPhone()
            const note = randomNote(notes)
            const [routeMin, routeMax] = getPriceRange(province, randomDest, defaultMin, defaultMax)
            const price = randomPrice(routeMin, routeMax)

            localRequests.push({
              _id: `local-${regionType}-${province}-${i}`,
              name: fakeNames[nameIdx],
              phone,
              startPoint: province,
              endPoint: randomDest,
              price,
              note,
              region: regionType,
              createdAt: new Date().toISOString(),
            })
          }
        })
      }

      console.log(`🧪 Seed local: ${localRequests.length} rides (~${perProvince} per state)`)
      setRequests(localRequests)
      return { total: localRequests.length }
    }

    // Helper: seed fake rides for a specific state (local only, no API call)
    const seedLocalProvinceRequests = (province: string, options?: { perProvince?: number }) => {
      const perProvince = options?.perProvince ?? 20
      const region = getRegionFromProvince(province)
      if (!region) {
        console.warn('Could not determine region for state:', province)
        return { total: 0 }
      }

      const fakeNames = [
        'James Wilson', 'Sarah Johnson', 'Michael Davis', 'Emily Brown',
        'Robert Garcia', 'Jennifer Martinez', 'David Anderson', 'Lisa Thomas',
        'Christopher Jackson', 'Amanda White', 'Matthew Harris', 'Ashley Lewis',
        'Daniel Clark', 'Jessica Robinson', 'Andrew Thompson', 'Stephanie Lee'
      ]
      const notes = [
        'Need car ASAP, 4 seats', '7-seat van, heavy luggage', 'Early pickup at 6am',
        'Experienced driver preferred', 'Same-day round trip', 'Available until 8pm',
        'New model car, good AC', 'Highway route needed', 'Children traveling',
        'Careful driver needed', 'Business trip, must be on time', 'Elderly passenger'
      ]

      const provinces = provincesByRegion[region] || []
      const preferred = provincePreferredDestinations[province] || []
      const destinationsPool = preferred.length ? preferred : provinces
      const destinations = destinationsPool.filter((p) => p !== province)
      const isShort = preferred.length > 0
      const defaultMin = isShort ? 25 : 60
      const defaultMax = isShort ? 80 : 180
      if (destinations.length === 0) {
        console.warn('No valid destinations in same region for state:', province)
        return { total: 0 }
      }

      const newRequests: Array<{ _id: string; name: string; phone: string; startPoint: string; endPoint: string; price: number; createdAt: string; note?: string; region?: Region }> = []

      for (let i = 0; i < perProvince; i++) {
        const randomDest = destinations[Math.floor(Math.random() * destinations.length)]
        const nameIdx = i % fakeNames.length
        const phone = randomPhone()
        const note = randomNote(notes)
        const [routeMin, routeMax] = getPriceRange(province, randomDest, defaultMin, defaultMax)
        const price = randomPrice(routeMin, routeMax)

        newRequests.push({
          _id: `local-${province}-${i}-${Date.now()}`,
          name: fakeNames[nameIdx],
          phone,
          startPoint: province,
          endPoint: randomDest,
          price,
          note,
          region,
          createdAt: new Date().toISOString(),
        })
      }

      setRequests((prev) => [...newRequests, ...prev])
      console.log(`🧪 Seed local ${province}: +${newRequests.length} rides (~${perProvince})`)
      return { total: newRequests.length }
    }

      // Expose function to window for console access
      ; (window as any).createFakeRequests = createFakeRequests;
    ; (window as any).seedLocalFakeRequests = seedLocalFakeRequests;
    ; (window as any).seedLocalProvinceRequests = seedLocalProvinceRequests;
    ; (window as any).createProvinceRequests = createProvinceRequests;
    if (isDev) {
      console.log('💡 Create fake rides (API): createFakeRequests({ perProvince: 100, delayMs: 10 })')
      console.log('💡 Seed local all states (no API): seedLocalFakeRequests({ perProvince: 100 })')
      console.log('💡 Seed local 1 state: seedLocalProvinceRequests("New York", { perProvince: 100 })')
      console.log('💡 Create fake rides to server for 1 state: createProvinceRequests("New York", { count: 20, delayMs: 20 })')
    }

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      delete (window as any).createFakeRequests;
      delete (window as any).seedLocalFakeRequests;
      delete (window as any).seedLocalProvinceRequests;
      delete (window as any).createProvinceRequests;
      seedingRef.current = false
    };
  }, []);

  const [showModal, setShowModal] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null)
  const [user, setUser] = useState<User | null>(() => {
    try { 
      const savedUser = JSON.parse(localStorage.getItem('driver_user') || 'null');
      // If user exists but missing status, we'll fetch it in useEffect
      return savedUser;
    } catch { 
      return null;
    }
  })
  
  // State to control showing driver dashboard
  const [showDriverDashboard, setShowDriverDashboard] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showDownloadPage, setShowDownloadPage] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('1y');
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [runTour, setRunTour] = useState(false);

  const tourSteps: Step[] = [
    {
      target: '#joyride-download-btn',
      title: '📱 Download the Mobile App',
      content: 'Tap here to download the app to your phone. Get INSTANT ride notifications — never miss a job!',
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      target: '#joyride-pricing-cards',
      title: '💳 Choose Your Plan',
      content: 'Pick the 1-Year plan – $20 ⭐ or Lifetime – $50 👑. Confirm payment and get your APK download link instantly!',
      placement: 'top',
      skipBeacon: true,
      targetWaitTimeout: 4000,
    },
  ];

  const handleJoyrideCallback = (data: any) => {
    const { status, type, index } = data;
    if (type === EVENTS.STEP_AFTER && index === 0) {
      setShowPricingModal(true);
    }
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRunTour(false);
      localStorage.setItem('joyride_done', '1');
    }
  };

  const startTour = () => {
    if (user?.status === 'approved' && !localStorage.getItem('joyride_done')) {
      setRunTour(true);
    }
  };

  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorPopupTitle, setErrorPopupTitle] = useState('Notice');

  const checkShouldShowWelcome = () => {
    const hiddenUntil = localStorage.getItem('welcome_modal_hidden_until');
    if (!hiddenUntil) return true;
    return Date.now() > parseInt(hiddenUntil, 10);
  };

  const handleHideWelcome2Hours = () => {
    localStorage.setItem('welcome_modal_hidden_until', String(Date.now() + 2 * 60 * 60 * 1000));
    setShowWelcomeModal(false);
  };
  const [downloadStatus, setDownloadStatus] = useState<{
    downloadCount: number;
    withinTwoDays: boolean;
    appPlan: string | null;
  }>({ downloadCount: 0, withinTwoDays: false, appPlan: null });
  
  // Fetch user info if logged in but missing status
  useEffect(() => {
    const fetchUserInfo = async () => {
      console.log('Checking user:', user);
      console.log('User status:', user?.status);
      
      if (user && !user.status) {
        try {
          console.log('User missing status, fetching from API...');
          const response = await authAPI.getMe();
          const userData = {
            ...response.data.user,
            _id: response.data.user.id || response.data.user._id
          };
          console.log('Fetched user data:', userData);
          localStorage.setItem('driver_user', JSON.stringify(userData));
          setUser(userData);
        } catch (error) {
          console.error('Error fetching user info:', error);
          // If token is invalid, clear user
          localStorage.removeItem('driver_user');
          localStorage.removeItem('token');
          setUser(null);
        }
      } else if (user && user.status) {
        console.log('User has status:', user.status);
        console.log('Should show dashboard:', user.status === 'approved');
      }
    };
    fetchUserInfo();
  }, [user]);

  // Show welcome modal on app load if user already logged in
  useEffect(() => {
    if (user && checkShouldShowWelcome()) {
      const timer = setTimeout(() => setShowWelcomeModal(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Fetch download status from DB when user is approved
  useEffect(() => {
    const fetchDownloadStatus = async () => {
      if (user && user.status === 'approved') {
        try {
          const res = await driverAPI.getDownloadStatus();
          setDownloadStatus({
            downloadCount: res.data.downloadCount || 0,
            withinTwoDays: res.data.withinTwoDays || false,
            appPlan: res.data.appPlan || null,
          });
        } catch (error) {
          console.error('Error fetching download status:', error);
        }
      }
    };
    fetchDownloadStatus();
  }, [user?.status]);
  const [drivers, setDrivers] = useState<DriverPost[]>(posts)
  const [activeRegion, setActiveRegion] = useState<Region>('north')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [authForm, setAuthForm] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    carType: '',
    carYear: '',
    carImage: ''
  })
  // Removed car image preview state
  const [menuOpen, setMenuOpen] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [dragCurrentY, setDragCurrentY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [requests, setRequests] = useState<Array<{ _id: string; name: string; phone: string; startPoint: string; endPoint: string; price: number; createdAt: string; note?: string; region?: Region }>>([])
  const [callSheet, setCallSheet] = useState<{ phone: string } | null>(null)
  const [pendingAction, setPendingAction] = useState<null | { type: 'wait' } | { type: 'call', phone: string }>(null)
  const [activeRequestRegion, setActiveRequestRegion] = useState<Region>('north')
  const [selectedProvince, setSelectedProvince] = useState<Record<Region, string>>({
    north: '',
    central: '',
    south: ''
  })
  const [showPayment, setShowPayment] = useState(false)
  const [pendingRegister, setPendingRegister] = useState<{ name: string; phone: string; password: string; carType: string; carYear: string } | null>(null)
  const [paypalMe, setPaypalMe] = useState('');
  useEffect(() => {
    bankConfigAPI.getBankConfig().then(res => {
      if (res.data?.data?.paypalMe) setPaypalMe(res.data.data.paypalMe);
    }).catch(() => {});
  }, []);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    startPoint: '',
    endPoint: '',
    price: '',
    note: '',
    region: 'north' as Region,
  })

  const formatPhone = (phone: string) => (user ? phone : maskPhoneStrict(phone))

  const normalizedDrivers = drivers.map((driver) => ({
    ...driver,
    region: (driver.region ?? 'north') as Region,
  }))

  const regionDrivers = normalizedDrivers.filter((driver) => driver.region === activeRegion)
  const displayedDrivers = regionDrivers.length > 0 ? regionDrivers : fallbackDriversByRegion[activeRegion]
  const tickerDrivers = (displayedDrivers.length > 0 ? displayedDrivers : normalizedDrivers).slice(0, 6)

  // Filter requests by region and province, then sort newest first
  const regionRequests = requests
    .filter((request) => {
      const requestRegion = (request.region || 'north') as Region
      if (requestRegion !== activeRequestRegion) return false

      const selected = selectedProvince[activeRequestRegion]
      // Show all if not selected OR empty string (from dropdown default)
      if (!selected || selected.trim() === '') return true

      // Filter theo tỉnh thành: kiểm tra startPoint hoặc endPoint
      return request.startPoint === selected || request.endPoint === selected
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const toInitials = (name: string) => {
    const parts = (name || '').trim().split(/\s+/)
    const first = parts[0]?.[0] || ''
    const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
    return (first + last).toUpperCase() || 'TX'
  }

  const pickAvatarIndex = (name: string, phone: string, region: Region) => {
    if (avatarImages.length === 0) return -1
    // Split global pool into 3 region-specific sub-pools to reduce cross-region duplicates
    const regionOffset = region === 'north' ? 0 : region === 'central' ? 1 : 2
    const regionPool = avatarImages.filter((_, i) => i % 3 === regionOffset)
    const pool = regionPool.length > 0 ? regionPool : avatarImages

    // Hash by name+phone for stable selection inside the pool
    const base = `${name}-${phone}`
    let hash = 0
    for (let i = 0; i < base.length; i++) {
      hash = (hash * 31 + base.charCodeAt(i)) >>> 0
    }

    const idxInPool = Math.abs(hash) % pool.length

    // Map index-in-pool back to global index for rendering
    if (pool === avatarImages) return idxInPool
    // find nth matching index where i % 3 === regionOffset
    let count = -1
    for (let i = 0; i < avatarImages.length; i++) {
      if (i % 3 === regionOffset) {
        count++
        if (count === idxInPool) return i
      }
    }
    return idxInPool % avatarImages.length
  }

  // Load drivers from API
  useEffect(() => {
    const loadDrivers = async () => {
      try {
        const response = await driversAPI.getDrivers()
        const remoteDrivers = Array.isArray(response.data?.drivers) ? (response.data.drivers as DriverPost[]) : []
        const normalizedRemote = remoteDrivers.map((driver) => ({
          ...driver,
          region: (driver.region ?? 'north') as Region,
        }))

        const seenIds = new Set(normalizedRemote.map((driver) => driver._id))
        const supplemented = [...normalizedRemote]

        for (const region of ['north', 'central', 'south'] as Region[]) {
          const hasRegion = supplemented.some((driver) => driver.region === region)
          if (!hasRegion) {
            fallbackDriversByRegion[region].forEach((driver, index) => {
              const fallbackId = seenIds.has(driver._id) ? `fallback-${region}-${index}-${driver._id}` : driver._id
              supplemented.push({
                ...driver,
                _id: fallbackId,
                region: driver.region ?? region,
              })
            })
          }
        }

        setDrivers(supplemented.length ? supplemented : posts)
      } catch (error) {
        console.error('Error loading drivers:', error)
        setDrivers(posts)
      }
    }
    loadDrivers()
  }, [])


  // Load public waiting requests for homepage ticker/card list
  useEffect(() => {
    const loadRequests = async () => {
      try {
        // Fetch all waiting requests (no artificial limit so filtering by region doesn't hide items)
        const res = await requestsAPI.getAllRequests({ status: 'waiting' })
        const list = Array.isArray(res.data?.requests) ? res.data.requests : []
        // Sort newest first so các cuốc mới luôn nằm trên cùng
        list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setRequests(list)
      } catch (e) {
        console.error('Error loading requests', e)
        setRequests([])
      }
    }
    loadRequests()
  }, [])

  // Auto-open registration modal on first visit when not logged in - DISABLED
  // useEffect(() => {
  //   const hasUser = !!localStorage.getItem('driver_user')
  //   if (!hasUser) {
  //     setAuthModal('register')
  //   }
  // }, [])

  // If URL hash points to requests, scroll to it on mount
  useEffect(() => {
    const shouldOpen = location.hash === '#requests' || new URLSearchParams(location.search).get('show') === 'requests'
    if (shouldOpen) {
      setTimeout(() => {
        document.getElementById('requests')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [])


  const openModal = () => setShowModal(true)
  const closeModal = () => setShowModal(false)
  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((p) => {
      const updated = { ...p, [name]: value }

      // Tự động xác định region khi chọn startPoint hoặc endPoint
      if (name === 'startPoint' || name === 'endPoint') {
        const province = value
        const detectedRegion = getRegionFromProvince(province)
        if (detectedRegion) {
          updated.region = detectedRegion
        }
      }

      return updated
    })
  }
  // Car image upload removed per request

  // Drag handlers for modal
  const handleDragStart = (e: React.TouchEvent) => {
    if (window.innerWidth <= 768) {
      setDragStartY(e.touches[0].clientY)
      setIsDragging(true)
    }
  }

  const handleDragMove = (e: React.TouchEvent) => {
    if (isDragging && window.innerWidth <= 768) {
      setDragCurrentY(e.touches[0].clientY)
    }
  }

  const handleDragEnd = () => {
    if (isDragging && window.innerWidth <= 768) {
      const deltaY = dragCurrentY - dragStartY
      if (deltaY > 100) {
        // Close modal if dragged down significantly
        setAuthModal(null)
      }
      setIsDragging(false)
      setDragStartY(0)
      setDragCurrentY(0)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const parsedPrice = parseInt(form.price) || 0
    if (parsedPrice <= 0) {
      alert('Giá phải lớn hơn 0đ')
      return
    }

    setLoading(true)
    try {
      await requestsAPI.createRequest({
        name: form.name,
        phone: form.phone,
        startPoint: form.startPoint,
        endPoint: form.endPoint,
        price: parsedPrice,
        note: form.note,
        region: form.region
      })

      // Tải lại danh sách yêu cầu mà KHÔNG thay đổi activeRequestRegion
      try {
        // Reload all waiting requests (no limit)
        const res = await requestsAPI.getAllRequests({ status: 'waiting' })
        const list = Array.isArray(res.data?.requests) ? res.data.requests : []
        list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setRequests(list)
      } catch (e) {
        console.error('Error reloading requests', e)
      }

      // Sau khi đăng ký xong, chọn đúng miền và tỉnh thành vừa đăng ký
      setActiveRequestRegion(form.region)
      // Tự động chọn tỉnh thành từ startPoint hoặc endPoint
      const selectedProvinceValue = form.startPoint || form.endPoint
      if (selectedProvinceValue) {
        setSelectedProvince({
          ...selectedProvince,
          [form.region]: selectedProvinceValue
        })
      }

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2200)
      setShowModal(false)
      setForm({ name: '', phone: '', startPoint: '', endPoint: '', price: '', note: '', region: 'north' })
    } catch (error) {
      console.error('Error creating request:', error)
      alert('Có lỗi xảy ra khi tạo yêu cầu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">

      {/* Joyride tour hướng dẫn tải APK */}
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        onEvent={handleJoyrideCallback}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Done',
          next: 'Next',
          skip: 'Skip',
        }}
        options={{ primaryColor: '#22c55e', showProgress: true, zIndex: 10000 }}
      />

      {/* Welcome modal hiện sau khi login */}
      <LoginWelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        onHide2Hours={handleHideWelcome2Hours}
        onAfterClose={startTour}
      />

      {/* Show Driver Dashboard only when user clicks to open it */}
      {showDriverDashboard && user && user.status === 'approved' && (
        <DriverDashboard 
          user={user}
          onBack={() => setShowDriverDashboard(false)}
          onLogout={() => {
            localStorage.removeItem('driver_user');
            localStorage.removeItem('token');
            localStorage.removeItem('driver_registered');
            setUser(null);
            setShowDriverDashboard(false);
          }}
        />
      )}

      {/* Show main app (hide when dashboard is open) */}
      {!showDriverDashboard && (
        <>
      {!user && (
        <div className="topbar">
          <button className="hamburger" aria-label="Menu" onClick={() => setMenuOpen((v) => !v)}> MENU</button>
          {menuOpen && (
            <div className="menu-popover">
              {/* Menu chỉ hiển thị khi chưa đăng nhập */}
            </div>
          )}
        </div>
      )}

      {/* Auth Box - Tách riêng khỏi menu */}
      {!user && (
        <div className="auth-box">
          <div className="auth-box__content">
            <h3 className="auth-box__title">Join the Driver Network</h3>
            <p className="auth-box__subtitle">Sign up to contact drivers and post ride requests</p>
            <div className="auth-box__buttons">
              <button
                className="auth-box__btn auth-box__btn--primary"
                onClick={() => setAuthModal('register')}
              >
                Sign Up
              </button>
              <button
                className="auth-box__btn auth-box__btn--secondary"
                onClick={() => setAuthModal('login')}
              >
                Log In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nút đăng xuất + thông tin khách khi đã đăng nhập */}
      {user && (
        <div className="main-actions">
          <div 
            className="user-summary-card user-summary-card--clickable"
            onClick={() => {
              if (user.status === 'approved') {
                setShowDriverDashboard(true);
              } else {
                setErrorPopupTitle('Notice');
                setErrorMessage('Your account is pending admin approval. Please try again later.');
                setShowErrorPopup(true);
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="user-summary-card__avatar">
              {toInitials(user.name || user.phone)}
            </div>
            <div className="user-summary-card__info">
              <span className="user-summary-card__greeting">Hello,</span>
              <strong className="user-summary-card__name">{user.name || 'Driver'}</strong>
              <span className="user-summary-card__phone">{maskPhoneStrict(user.phone)}</span>
              {user.status === 'approved' && (
                <span className="user-summary-card__hint"> Tap to open dashboard</span>
              )}
            </div>
          </div>

          {/* Nút tải ứng dụng ở trang chủ */}
          {user.status === 'approved' && (
            <button
              id="joyride-download-btn"
              className="main-action-btn"
              style={{
                borderColor: '#e2e8f0',
                justifyContent: 'space-between',
                marginBottom: '8px',
                color: '#1e293b'
              }}
              onClick={() => {
                const { downloadCount, withinTwoDays } = downloadStatus;

                // Đã tải rồi nhưng quá 2 ngày → block
                if (downloadCount > 0 && !withinTwoDays) {
                  setErrorPopupTitle('Notice');
                  setErrorMessage('You have already downloaded the app. To re-download, please contact Admin!');
                  setShowErrorPopup(true);
                  return;
                }

                // Đã tải rồi và còn trong 2 ngày → tải lại không cần chọn gói
                if (downloadCount > 0 && withinTwoDays) {
                  setShowDownloadPage(true);
                  return;
                }

                // Chưa tải lần nào → luôn phải chọn gói
                setShowPricingModal(true);
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="main-action-btn__icon">📱</span>
                <span className="main-action-btn__text" style={{ color: '#1e293b' }}>Download Mobile App</span>
              </span>
              <span style={{ background: '#22c55e', color: 'white', padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px' }}>APK</span>
            </button>
          )}

          <button
            className="main-action-btn main-action-btn--logout"
            onClick={() => {
              localStorage.removeItem('driver_user');
              localStorage.removeItem('token');
              localStorage.removeItem('driver_registered');
              setUser(null);
              setShowDriverDashboard(false);
            }}
          >
            <span className="main-action-btn__icon">🚪</span>
            <span className="main-action-btn__text">Log Out</span>
          </button>
        </div>
      )}

      {/* Hiển thị thông báo cuốc xe ảo cho tất cả người dùng ở trang chủ */}
      {!showDriverDashboard && (
        <FakeNotificationBanner
          user={user}
          region={activeRequestRegion}
          onRequireAuth={() => {
            setErrorPopupTitle('Sign Up Required');
            setErrorMessage('Please sign up or log in to accept ride requests.');
            setShowErrorPopup(true);
          }}
        />
      )}

      <header className="ticker">
        <div className="ticker__track">
          {tickerDrivers.map((p) => (
            <div className="ticker__item" key={`ticker-${p._id}`}>
              <span className="dot" />
              <span className="ticker__text">
                {p.name} is available: {p.route} - Contact {formatPhone(p.phone)}
              </span>
            </div>
          ))}
          {tickerDrivers.map((p) => (
            <div className="ticker__item" key={`ticker-dup-${p._id}`}>
              <span className="dot" />
              <span className="ticker__text">
                {p.name} is available: {p.route} - Contact {formatPhone(p.phone)}
              </span>
            </div>
          ))}
        </div>
      </header>

      <main className="content">
        {/* Yêu cầu chở cuốc xe - Hiển thị luôn trên màn hình chính */}
        <section className="requests-section" id="requests">
          <h2 className="requests-heading">Ride Requests</h2>

          <div className="region-tabs" style={{ marginBottom: 16 }}>
            {(['north', 'central', 'south'] as Region[]).map((region) => (
              <button
                key={region}
                className={`region-tab ${activeRequestRegion === region ? 'active' : ''}`}
                onClick={() => setActiveRequestRegion(region)}
              >
                {regionLabels[region]}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Select State</span>
              <motion.select
                name="province"
                value={selectedProvince[activeRequestRegion]}
                onChange={(e) => {
                  setSelectedProvince({
                    ...selectedProvince,
                    [activeRequestRegion]: e.target.value
                  })
                }}
                required
                whileFocus={{ boxShadow: '0 0 0 3px rgba(0,177,79,.18)' }}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '2px solid #e5e7eb',
                  fontSize: '15px',
                  fontWeight: '600',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23333\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  paddingRight: '36px'
                }}
              >
                <option value="">All States ({regionLabels[activeRequestRegion]})</option>
                {provincesByRegion[activeRequestRegion].map((province) => (
                  <option key={province} value={province}>{province}</option>
                ))}
              </motion.select>
            </label>
          </div>

          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#333' }}>
            {regionLabels[activeRequestRegion]}
            {selectedProvince[activeRequestRegion] && ` - ${selectedProvince[activeRequestRegion]}`}
          </h3>

          {regionRequests.length === 0 && (
            <div className="empty-state">No ride requests in {regionLabels[activeRequestRegion]} yet.</div>
          )}
          {regionRequests.map((r) => (
            <div className="request-card" key={r._id}>
              <div className="request-main">
                <div className="request-name">{r.name}</div>
                <div className="request-phone">Customer phone: {formatPhone(r.phone)}</div>
                <div className="request-route">{r.startPoint} -&gt; {r.endPoint}</div>
                {r.note && <div className="request-note">Note: {r.note}</div>}
                <div className="request-price">Price: ${r.price?.toLocaleString('en-US')}</div>
              </div>
              <button className="copy-btn" onClick={() => {
                const text = `${r.name}\n${r.phone}\n${r.startPoint} -> ${r.endPoint}\nPrice: $${r.price?.toLocaleString('en-US')}`
                navigator.clipboard.writeText(text)
              }}>CALL DRIVER NOW</button>
            </div>
          ))}
        </section>

        {/* Danh sách tài xế */}
        <section className="drivers-section">
          <h2 className="section-heading">Driver Directory</h2>

          <div className="region-tabs">
            {(['north', 'central', 'south'] as Region[]).map((region) => (
              <button
                key={region}
                className={`region-tab ${activeRegion === region ? 'active' : ''}`}
                onClick={() => setActiveRegion(region)}
              >
                {regionLabels[region]}
              </button>
            ))}
          </div>
          <h3 className="region-heading">{regionLabels[activeRegion]}</h3>

          {displayedDrivers.length === 0 && (
            <div className="empty-state">No drivers in this region yet.</div>
          )}

          {(() => {
            const usedAvatarIdx = new Set<number>(); return displayedDrivers.map((p) => {
              return (
                <article className="driver-card" key={p._id}>
                  <div className="avatar" aria-label={p.name} title={p.name}>
                    {(() => {
                      let idx = pickAvatarIndex(p.name, p.phone, (p.region as Region) || 'north')
                      if (idx >= 0 && usedAvatarIdx.has(idx)) {
                        // try next candidates within same region pool (step by 3 keeps region bucket)
                        let tries = 0
                        while (tries < avatarImages.length) {
                          idx = (idx + 3) % avatarImages.length
                          if (!usedAvatarIdx.has(idx)) break
                          tries++
                        }
                      }
                      if (idx >= 0) usedAvatarIdx.add(idx)
                      const chosen = p.avatar || (idx >= 0 ? avatarImages[idx] : null)
                      // In case new images are added/removed, ensure index stays in range
                      if (!chosen) return <span>{toInitials(p.name)}</span>
                      return <img src={chosen} alt={p.name} />
                    })()}
                  </div>
                  <div className="driver-info">
                    <div className="driver-phone">{formatPhone(p.phone)}</div>
                    <div className="driver-route">{p.route}</div>
                  </div>
                  <button
                    className="call-btn"
                    aria-label="Call driver"
                    onClick={() => {
                      if (!user) {
                        setPendingAction({ type: 'call', phone: p.phone })
                        const reg = localStorage.getItem('driver_registered')
                        setAuthModal(reg ? 'login' : 'register')
                        return
                      }
                      setCallSheet({ phone: p.phone })
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff">
                      <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V21a1 1 0 01-1 1A18 18 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.24 1.01l-2.21 2.22z" />
                    </svg>
                  </button>
                </article>
              )
            })
          })()}
        </section>
      </main>

      <button className="floating-cta" onClick={() => {
        if (!user) {
          setPendingAction({ type: 'wait' })
          const reg = localStorage.getItem('driver_registered')
          setAuthModal(reg ? 'login' : 'register')
          return
        }
        openModal()
      }}>
        POST A RIDE REQUEST
        <span className="chevron">›</span>
      </button>

      <AnimatePresence>
        {showModal && (
          <div className="modal" role="dialog" aria-modal="true">
            <motion.div className="modal__backdrop" onClick={closeModal}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div className="modal__panel"
              initial={{ opacity: 0, y: 40, scale: .98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: .98 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            >
              <div className="modal__header">
                <div className="modal__title">Post a Ride Request</div>
                <button className="modal__close" onClick={closeModal} aria-label="Close">×</button>
              </div>
              <form className="form" onSubmit={onSubmit}>
                <label className="field">
                  <span>Full Name</span>
                  <input name="name" value={form.name} onChange={onChange} placeholder="e.g. John Smith" required />
                </label>
                <label className="field">
                  <span>Phone Number</span>
                  <input name="phone" value={form.phone} onChange={onChange} placeholder="e.g. 2125551234" inputMode="tel" pattern="[0-9]{9,11}" required />
                </label>
                <label className="field">
                  <span>Region</span>
                  <motion.select name="region" value={form.region} onChange={(e) => onChange(e as any)} required
                    whileFocus={{ boxShadow: '0 0 0 3px rgba(0,177,79,.18)' }}
                  >
                    <option value="north">Northeast</option>
                    <option value="central">South</option>
                    <option value="south">West</option>
                  </motion.select>
                </label>
                <div className="field" style={{ gridTemplateColumns: '1fr 1fr', display: 'grid', gap: '12px' }}>
                  <label className="field">
                    <span>Origin State</span>
                    <motion.select name="startPoint" value={form.startPoint} onChange={(e) => onChange(e as any)} required
                      whileFocus={{ boxShadow: '0 0 0 3px rgba(0,177,79,.18)' }}
                    >
                      <option value="" disabled>Select state</option>
                      {provincesVN63.map((p) => (
                        <option key={'s-' + p} value={p}>{p}</option>
                      ))}
                    </motion.select>
                  </label>
                  <label className="field">
                    <span>Destination State</span>
                    <motion.select name="endPoint" value={form.endPoint} onChange={(e) => onChange(e as any)} required
                      whileFocus={{ boxShadow: '0 0 0 3px rgba(0,177,79,.18)' }}
                    >
                      <option value="" disabled>Select state</option>
                      {provincesVN63.map((p) => (
                        <option key={'e-' + p} value={p}>{p}</option>
                      ))}
                    </motion.select>
                  </label>
                </div>
                <label className="field">
                  <span>Estimated Price (USD $)</span>
                  <input
                    name="price"
                    value={form.price}
                    onChange={onChange}
                    placeholder="e.g. 80"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min={1}
                    required
                  />
                </label>
                <label className="field">
                  <span>Notes</span>
                  <textarea name="note" value={form.note} onChange={onChange} placeholder="Schedule, vehicle type..." rows={3} />
                </label>
                <motion.button type="submit" className="submit"
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ filter: 'brightness(1.05)' }}
                  disabled={loading}
                >
                  {loading ? 'SENDING...' : 'SUBMIT REQUEST'}
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!!authModal && (
          <div className="modal" role="dialog" aria-modal="true">
            <motion.div className="modal__backdrop" onClick={() => setAuthModal(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div
              className={`modal__panel ${isDragging ? 'dragging' : ''}`}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              style={{
                transform: isDragging ? `translateY(${Math.max(0, dragCurrentY - dragStartY)}px)` : undefined
              }}
            >
              <div
                className="modal__header"
                onTouchStart={handleDragStart}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
              >
                <div className="modal__title">{authModal === 'login' ? 'Log In' : 'Sign Up'}</div>
                <button className="modal__close" onClick={() => setAuthModal(null)} aria-label="Close">×</button>
              </div>
              <form className="form" onSubmit={async (e) => {
                e.preventDefault();
                if (loading) return;

                console.log('Form submission started', { authModal, authForm });

                // Validate form data
                if (authModal === 'register') {
                  if (!authForm.name.trim()) {
                    alert('Please enter your full name!');
                    return;
                  }
                  if (!authForm.phone.trim()) {
                    alert('Please enter your phone number!');
                    return;
                  }
                  if (!authForm.carType.trim()) {
                    alert('Please enter your vehicle type!');
                    return;
                  }
                  if (!authForm.carYear.trim()) {
                    alert('Please enter your vehicle year!');
                    return;
                  }
                  if (authForm.password.length < 4) {
                    alert('Password must be at least 4 characters!');
                    return;
                  }
                  if (authForm.password !== authForm.confirmPassword) {
                    alert('Passwords do not match!');
                    return;
                  }

                  // Show payment modal before actual registration
                  setPendingRegister({
                    name: authForm.name,
                    phone: authForm.phone,
                    password: authForm.password,
                    carType: authForm.carType,
                    carYear: authForm.carYear,
                  })
                  setShowPayment(true)
                  return;
                } else {
                  if (!authForm.phone.trim()) {
                    alert('Please enter your phone number!');
                    return;
                  }
                  if (!authForm.password.trim()) {
                    alert('Please enter your password!');
                    return;
                  }
                }

                setLoading(true)
                try {
                  if (authModal === 'login') {
                    console.log('Attempting login...');
                    const response = await authAPI.login({
                      phone: authForm.phone,
                      password: authForm.password
                    })

                    console.log('Login successful:', response.data);
                    
                    // Map id to _id for consistency
                    const userData = {
                      ...response.data.user,
                      _id: response.data.user.id || response.data.user._id
                    };
                    
                    localStorage.setItem('token', response.data.token)
                    localStorage.setItem('driver_user', JSON.stringify(userData))
                    localStorage.setItem('driver_registered', '1')
                    setUser(userData)
                    setAuthModal(null)
                    setShowSuccess(true)
                    setTimeout(() => setShowSuccess(false), 1600)
                    if (checkShouldShowWelcome()) {
                      setTimeout(() => setShowWelcomeModal(true), 800);
                    }

                    if (pendingAction) {
                      if (pendingAction.type === 'wait') openModal()
                      if (pendingAction.type === 'call') setCallSheet({ phone: pendingAction.phone })
                      setPendingAction(null)
                    }
                  }
                } catch (error: any) {
                  console.error('Auth error details:', {
                    error,
                    message: error.message,
                    response: error.response?.data,
                    status: error.response?.status,
                    statusText: error.response?.statusText
                  });

                  let errorMsg = 'An error occurred';

                  // Handle specific error cases
                  if (error.response?.status === 403) {
                    if (error.response?.data?.message?.includes('phê duyệt') || error.response?.data?.message?.includes('approval')) {
                      errorMsg = 'Account is pending admin approval. Please try again later.';
                    } else {
                      errorMsg = 'Account not yet approved. Please contact admin.';
                    }
                  } else if (error.response?.data?.message) {
                    errorMsg = error.response.data.message;
                  } else if (error.message) {
                    errorMsg = error.message;
                  } else if (error.code === 'NETWORK_ERROR' || !error.response) {
                    errorMsg = 'Cannot connect to server. Please check your internet connection.';
                  }

                  setErrorMessage(errorMsg)
                  setShowError(true)
                  setTimeout(() => setShowError(false), 5000)
                } finally {
                  setLoading(false)
                  setAuthForm({ name: '', phone: '', password: '', confirmPassword: '', carType: '', carYear: '', carImage: '' })
                }
              }}>
                {authModal === 'register' && (
                  <label className="field">
                    <span>Full Name</span>
                    <input name="name" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} placeholder="e.g. John Smith" required />
                  </label>
                )}
                <label className="field">
                  <span>Phone Number</span>
                  <input name="phone" value={authForm.phone} onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })} inputMode="tel" pattern="[0-9]{9,11}" placeholder="e.g. 2125551234" required />
                </label>
                {authModal === 'register' && (
                  <>
                    <label className="field">
                      <span>Vehicle Type</span>
                      <input name="carType" value={authForm.carType} onChange={(e) => setAuthForm({ ...authForm, carType: e.target.value })} placeholder="e.g. Toyota Camry, Honda Civic..." required />
                    </label>
                    <label className="field">
                      <span>Vehicle Year</span>
                      <input name="carYear" value={authForm.carYear} onChange={(e) => setAuthForm({ ...authForm, carYear: e.target.value })} placeholder="e.g. 2020, 2021..." required />
                    </label>

                  </>
                )}
                <label className="field">
                  <span>Password</span>
                  <div style={{position:'relative',display:'flex',alignItems:'center'}}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      placeholder="At least 4 characters"
                      autoComplete={authModal === 'register' ? 'new-password' : 'current-password'}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      style={{position:'absolute',right:'10px',background:'none',border:'none',cursor:'pointer',color:'#888',fontSize:'18px',padding:0}}
                      tabIndex={-1}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </label>
                {authModal === 'register' && (
                  <label className="field">
                    <span>Confirm Password</span>
                    <input type="password" name="confirmPassword" value={authForm.confirmPassword} onChange={(e) => setAuthForm({ ...authForm, confirmPassword: e.target.value })} placeholder="Re-enter password" required />
                  </label>
                )}
                <motion.button
                  type="submit"
                  className="submit"
                  whileTap={{ scale: .98 }}
                  disabled={loading}
                  style={{
                    opacity: loading ? 0.7 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'PROCESSING...' : 'CONFIRM'}
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPayment && (
          <div className="modal" role="dialog" aria-modal="true">
            <motion.div className="modal__backdrop" onClick={() => setShowPayment(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div className="modal__panel" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
              <div className="modal__header">
                <div className="modal__title">Registration Fee - $10</div>
                <button className="modal__close" onClick={() => setShowPayment(false)} aria-label="Close">×</button>
              </div>
              <div style={{ padding: '8px 16px', overflowY: 'auto', flex: 1, maxHeight: 'calc(90vh - 60px)', WebkitOverflowScrolling: 'touch' }}>
                <p style={{ marginTop: 0 }}>Scan the QR below with your phone to pay the $10 registration fee via PayPal.</p>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`https://paypal.me/${paypalMe}/10`)}&bgcolor=ffffff&color=003087&margin=10`}
                    alt="PayPal QR"
                    style={{ width: 200, height: 200, borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,.10)', border: '2px solid #e5e7eb' }}
                  />
                  <div style={{ fontSize: 12, color: '#555', textAlign: 'center' }}>Or open link: <a href={`https://paypal.me/${paypalMe}/10`} target="_blank" rel="noopener noreferrer" style={{ color: '#0070ba', fontWeight: 700 }}>paypal.me/{paypalMe}/10</a></div>
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: '#888', textAlign: 'center' }}>After payment, click the button below to complete registration.</div>
                <div style={{ display: 'flex', gap: 12, marginTop: 16, marginBottom: 16 }}>
                  <button
                    className="submit"
                    onClick={async () => {
                      if (!pendingRegister) { setShowPayment(false); return }
                      setLoading(true)
                      try {
                        await authAPI.register(pendingRegister)
                        localStorage.setItem('driver_registered', '1')
                        setShowSuccess(true)
                        setErrorMessage('Registration successful! Your account is pending admin approval. You will be notified once approved.')
                        setShowError(true)
                        setTimeout(() => { setShowSuccess(false); setShowError(false) }, 5000)
                        setAuthModal(null)
                        setShowPayment(false)
                        setPendingRegister(null)
                      } catch (error: any) {
                        let errorMsg = 'An error occurred'
                        if (error.response?.data?.message) errorMsg = error.response.data.message
                        else if (error.message) errorMsg = error.message
                        setErrorMessage(errorMsg)
                        setShowError(true)
                        setTimeout(() => setShowError(false), 5000)
                      } finally {
                        setLoading(false)
                      }
                    }}
                    style={{ flex: 1 }}
                  >
                    I have paid - Continue
                  </button>
                  <button className="sheet__cancel" onClick={() => setShowPayment(false)} style={{ flex: 1 }}>Later</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>
      )}

      {user && (
        <>
          <AppPricingModal 
            isOpen={showPricingModal} 
            onClose={() => setShowPricingModal(false)}
            onConfirm={(plan) => {
              setSelectedPlan(plan.id);
              setShowPricingModal(false);
              setShowDownloadPage(true);
            }}
          />

          {showDownloadPage && (
            <DownloadAppPage 
              user={user}
              plan={downloadStatus.downloadCount > 0 ? (downloadStatus.appPlan || selectedPlan) : selectedPlan}
              onDownloaded={(plan) => {
                setDownloadStatus(prev => ({
                  ...prev,
                  downloadCount: prev.downloadCount + 1,
                  withinTwoDays: true,
                  appPlan: plan,
                }));
              }}
              onBack={() => setShowDownloadPage(false)} 
            />
          )}
        </>
      )}

      {/* Error Popup */}
      <AnimatePresence>
        {showErrorPopup && (
          <div className="error-popup-overlay" onClick={() => setShowErrorPopup(false)}>
            <motion.div
              className="error-popup"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
            >
              <div className="error-popup-icon">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  ⚠️
                </motion.div>
              </div>
              <h3 className="error-popup-title">{errorPopupTitle}</h3>
              <p className="error-popup-message">{errorMessage}</p>
              <button
                className="error-popup-btn"
                onClick={() => setShowErrorPopup(false)}
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}

// Main App with Router
function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="/*" element={<MainApp />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App












