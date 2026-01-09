# 📦 Open Source Repositories - Complete Usage Guide

## How We Use Open Source

### ✅ YES - We DO:
- **Import as dependencies** (via npm, pip, cargo)
- **Use APIs** from external services (ActivityWatch API)
- **Copy components** from MIT-licensed libraries (shadcn/ui)
- **Follow patterns** and learn from their code
- **Build upon** their foundation

### ❌ NO - We DON'T:
- Fork and modify MPL-2.0 code directly (would require open-sourcing)
- Copy proprietary code
- Claim their work as ours

---

## 📋 Repository List by Category

### 🔴 CORE - Must Use (These Are Essential)

#### 1. ActivityWatch
```
Repo: https://github.com/ActivityWatch/activitywatch
License: MPL-2.0 (Use API, don't modify source)
Stars: 10k+

WHAT IT DOES:
- Tracks active window/app
- Tracks browser URLs
- Tracks idle time
- Stores data locally

HOW WE USE:
- Install separately (user downloads ActivityWatch)
- Connect via REST API (http://localhost:5600)
- Consume events, don't store them there
- Our app aggregates and analyzes the data

INSTALLATION:
- User downloads from: https://activitywatch.net
- Runs as separate service
- Our app checks if it's running

WHY NOT MODIFY:
- MPL-2.0 requires open-sourcing modifications
- Better to use as data source via API
- Keep our code proprietary

API EXAMPLE:
```python
import requests

# Get current activity
response = requests.get("http://localhost:5600/api/0/buckets")
buckets = response.json()

# Get events from a bucket
events = requests.get(
    "http://localhost:5600/api/0/buckets/aw-watcher-window_hostname/events"
).json()
```
```

#### 2. psutil (Python)
```
Repo: https://github.com/giampaolo/psutil
License: BSD-3-Clause ✅ (Full freedom)
Stars: 10k+

WHAT IT DOES:
- CPU usage (total, per core, per process)
- Memory usage (RAM, swap)
- Disk usage and I/O
- Network statistics
- Process management
- Battery status
- System temperatures

HOW WE USE:
- pip install psutil
- Import and call functions
- No modification needed

INSTALLATION:
```bash
pip install psutil
```

CODE EXAMPLE:
```python
import psutil

# CPU
cpu_percent = psutil.cpu_percent(interval=1)
cpu_per_core = psutil.cpu_percent(percpu=True)

# Memory
memory = psutil.virtual_memory()
print(f"RAM: {memory.percent}%")

# Disk
disk = psutil.disk_usage('/')
print(f"Disk: {disk.percent}%")

# Processes
for proc in psutil.process_iter(['name', 'cpu_percent', 'memory_percent']):
    print(proc.info)

# Battery
battery = psutil.sensors_battery()
print(f"Battery: {battery.percent}%")
```
```

#### 3. Tauri
```
Repo: https://github.com/tauri-apps/tauri
License: MIT ✅ (Full freedom)
Stars: 80k+

WHAT IT DOES:
- Desktop app framework
- Rust backend
- Web frontend (React, Vue, etc.)
- Small bundle size (~10MB vs Electron 150MB+)
- Native system access
- System tray, notifications, etc.

HOW WE USE:
- Create project with CLI
- Write frontend in React
- Write native code in Rust
- Build for Windows/Mac/Linux

INSTALLATION:
```bash
# Install Rust first
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Tauri CLI
cargo install tauri-cli

# Create project
npm create tauri-app@latest
```

PROJECT TEMPLATE:
```bash
# Use the tauri-react-template as starting point
npx create-tauri-app --template react-ts productify-pro
```
```

#### 4. FastAPI
```
Repo: https://github.com/tiangolo/fastapi
License: MIT ✅ (Full freedom)
Stars: 75k+

WHAT IT DOES:
- Modern Python web framework
- Async support
- Auto-generated API docs
- Type hints & validation
- WebSocket support

HOW WE USE:
- pip install
- Create API routes
- Serve from background service

INSTALLATION:
```bash
pip install fastapi uvicorn
```

CODE EXAMPLE:
```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Activity(BaseModel):
    app_name: str
    window_title: str
    duration: int

@app.get("/api/activities")
async def get_activities():
    return {"activities": [...]}

@app.post("/api/activities")
async def create_activity(activity: Activity):
    return {"status": "created"}

# Run: uvicorn main:app --reload
```
```

#### 5. shadcn/ui
```
Repo: https://github.com/shadcn-ui/ui
License: MIT ✅ (Full freedom - copy/paste)
Stars: 70k+

WHAT IT DOES:
- Beautiful React components
- Built on Radix UI
- Tailwind CSS styling
- Copy-paste (not a dependency!)
- Full customization

HOW WE USE:
- Run CLI to add components
- Components are copied to our codebase
- Customize freely (colors, styles)
- Own the code completely

INSTALLATION:
```bash
# Initialize in React project
npx shadcn-ui@latest init

# Add components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
# etc.
```

CUSTOMIZATION:
- Edit components in src/components/ui/
- Change Tailwind colors in tailwind.config.js
- Full control over everything
```

---

### 🟡 AI & DATA - Important Libraries

#### 6. LangChain
```
Repo: https://github.com/langchain-ai/langchain
License: MIT ✅ (Full freedom)
Stars: 90k+

WHAT IT DOES:
- LLM abstraction layer
- Chains and agents
- Document processing
- Memory management
- Multiple LLM providers

HOW WE USE:
- pip install
- Create chains for insights
- Process activity data
- Generate reports

INSTALLATION:
```bash
pip install langchain langchain-openai
```

CODE EXAMPLE:
```python
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain

llm = ChatOpenAI(model="gpt-4o-mini")

prompt = PromptTemplate(
    input_variables=["data"],
    template="Analyze this productivity data and give 3 insights: {data}"
)

chain = LLMChain(llm=llm, prompt=prompt)
result = chain.run(data=activity_data)
```
```

#### 7. Instructor
```
Repo: https://github.com/jxnl/instructor
License: MIT ✅ (Full freedom)
Stars: 7k+

WHAT IT DOES:
- Structured outputs from LLMs
- Pydantic model validation
- Automatic retries
- Type-safe AI responses

HOW WE USE:
- Convert AI responses to structured data
- Use with OpenAI client
- Get guaranteed JSON structure

INSTALLATION:
```bash
pip install instructor
```

CODE EXAMPLE:
```python
import instructor
from openai import OpenAI
from pydantic import BaseModel

class ProductivityInsight(BaseModel):
    score: int
    category: str
    recommendation: str
    confidence: float

client = instructor.from_openai(OpenAI())

insight = client.chat.completions.create(
    model="gpt-4o-mini",
    response_model=ProductivityInsight,
    messages=[
        {"role": "user", "content": f"Analyze this activity: {activity}"}
    ]
)

# insight is a ProductivityInsight object!
print(insight.score)  # 78
print(insight.recommendation)  # "Take a break..."
```
```

#### 8. Supabase
```
Repo: https://github.com/supabase/supabase
License: Apache 2.0 ✅ (Full freedom)
Stars: 70k+

WHAT IT DOES:
- PostgreSQL database
- Authentication
- Real-time subscriptions
- Storage (files)
- Edge functions

HOW WE USE:
- Cloud sync (Pro feature)
- User authentication
- Team data storage
- NOT for local storage (use SQLite)

INSTALLATION:
```bash
pip install supabase
npm install @supabase/supabase-js
```

SETUP:
1. Create project at supabase.com
2. Get API URL and key
3. Initialize client

CODE EXAMPLE:
```python
from supabase import create_client

supabase = create_client(
    "https://xxx.supabase.co",
    "your-anon-key"
)

# Auth
user = supabase.auth.sign_in_with_password({
    "email": "user@example.com",
    "password": "password"
})

# Database
data = supabase.table("activities").select("*").execute()
```
```

---

### 🟢 UI & VISUALIZATION

#### 9. Recharts
```
Repo: https://github.com/recharts/recharts
License: MIT ✅ (Full freedom)
Stars: 23k+

WHAT IT DOES:
- React charting library
- Line, bar, area, pie charts
- Responsive
- Animated

HOW WE USE:
- npm install
- Import chart components
- Pass data as props

INSTALLATION:
```bash
npm install recharts
```

CODE EXAMPLE:
```jsx
import { AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

const data = [
  { hour: '9am', productivity: 85 },
  { hour: '10am', productivity: 92 },
  { hour: '11am', productivity: 78 },
];

function ProductivityChart() {
  return (
    <AreaChart width={600} height={300} data={data}>
      <XAxis dataKey="hour" />
      <YAxis />
      <Tooltip />
      <Area 
        type="monotone" 
        dataKey="productivity" 
        fill="#6366f1" 
        stroke="#4f46e5"
      />
    </AreaChart>
  );
}
```
```

#### 10. react-pdf
```
Repo: https://github.com/diegomura/react-pdf
License: MIT ✅ (Full freedom)
Stars: 14k+

WHAT IT DOES:
- Generate PDFs in React
- React component syntax
- Styled components for PDF
- Export reports

HOW WE USE:
- Weekly/monthly PDF reports
- Shareable productivity reports
- Professional output

INSTALLATION:
```bash
npm install @react-pdf/renderer
```

CODE EXAMPLE:
```jsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30 },
  title: { fontSize: 24, marginBottom: 20 },
  section: { marginBottom: 10 },
});

const ProductivityReport = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>Weekly Productivity Report</Text>
      <View style={styles.section}>
        <Text>Total Hours: {data.totalHours}</Text>
        <Text>Productivity Score: {data.score}%</Text>
      </View>
    </Page>
  </Document>
);
```
```

#### 11. Framer Motion
```
Repo: https://github.com/framer/motion
License: MIT ✅ (Full freedom)
Stars: 23k+

WHAT IT DOES:
- React animation library
- Declarative animations
- Gestures
- Page transitions
- Spring physics

HOW WE USE:
- Card hover animations
- Page transitions
- List animations
- Loading animations

INSTALLATION:
```bash
npm install framer-motion
```

CODE EXAMPLE:
```jsx
import { motion, AnimatePresence } from 'framer-motion';

function ActivityList({ activities }) {
  return (
    <AnimatePresence>
      {activities.map((activity, i) => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ delay: i * 0.1 }}
          whileHover={{ scale: 1.02 }}
        >
          <ActivityCard activity={activity} />
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
```
```

---

### 🔵 UTILITIES

#### 12. Keyring
```
Repo: https://github.com/jaraco/keyring
License: MIT ✅ (Full freedom)
Stars: 1.2k+

WHAT IT DOES:
- Secure credential storage
- Uses OS keychain
- Windows: Credential Manager
- macOS: Keychain
- Linux: Secret Service

HOW WE USE:
- Store OpenAI API key securely
- Store user credentials
- Never store secrets in plain text

INSTALLATION:
```bash
pip install keyring
```

CODE EXAMPLE:
```python
import keyring

# Store secret
keyring.set_password("productify", "openai_api_key", "sk-xxx...")

# Retrieve secret
api_key = keyring.get_password("productify", "openai_api_key")

# Delete secret
keyring.delete_password("productify", "openai_api_key")
```
```

#### 13. mss (Screenshot Library)
```
Repo: https://github.com/BoboTiG/python-mss
License: MIT ✅ (Full freedom)
Stars: 1k+

WHAT IT DOES:
- Cross-platform screenshots
- Multi-monitor support
- Fast capture
- Low memory usage

HOW WE USE:
- Capture screenshots
- Specific monitor or all
- Process with PIL

INSTALLATION:
```bash
pip install mss pillow
```

CODE EXAMPLE:
```python
import mss
from PIL import Image
import io

def capture_screenshot():
    with mss.mss() as sct:
        # Capture primary monitor
        screenshot = sct.grab(sct.monitors[1])
        
        # Convert to PIL Image
        img = Image.frombytes(
            'RGB', 
            screenshot.size, 
            screenshot.bgra, 
            'raw', 
            'BGRX'
        )
        
        # Compress as JPEG
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=70)
        
        return buffer.getvalue()
```
```

#### 14. Zustand (State Management)
```
Repo: https://github.com/pmndrs/zustand
License: MIT ✅ (Full freedom)
Stars: 45k+

WHAT IT DOES:
- Simple state management
- No boilerplate
- TypeScript support
- Persistent storage
- Devtools support

HOW WE USE:
- Global app state
- Settings storage
- Activity cache
- UI state

INSTALLATION:
```bash
npm install zustand
```

CODE EXAMPLE:
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ActivityStore {
  currentActivity: Activity | null;
  activities: Activity[];
  setCurrentActivity: (activity: Activity) => void;
  addActivity: (activity: Activity) => void;
}

const useActivityStore = create<ActivityStore>()(
  persist(
    (set) => ({
      currentActivity: null,
      activities: [],
      setCurrentActivity: (activity) => 
        set({ currentActivity: activity }),
      addActivity: (activity) => 
        set((state) => ({ 
          activities: [activity, ...state.activities] 
        })),
    }),
    { name: 'activity-storage' }
  )
);
```
```

#### 15. TanStack Query (React Query)
```
Repo: https://github.com/TanStack/query
License: MIT ✅ (Full freedom)
Stars: 41k+

WHAT IT DOES:
- Server state management
- Caching
- Auto refetching
- Mutations
- Optimistic updates

HOW WE USE:
- API data fetching
- Real-time updates
- Cache management
- Loading/error states

INSTALLATION:
```bash
npm install @tanstack/react-query
```

CODE EXAMPLE:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function useActivities() {
  return useQuery({
    queryKey: ['activities'],
    queryFn: () => fetch('/api/activities').then(r => r.json()),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

function useCurrentActivity() {
  return useQuery({
    queryKey: ['currentActivity'],
    queryFn: () => fetch('/api/activities/current').then(r => r.json()),
    refetchInterval: 3000, // Refetch every 3 seconds (live)
  });
}
```
```

---

### 🟣 OPTIONAL - Advanced Features

#### 16. Ollama (Local AI)
```
Repo: https://github.com/ollama/ollama
License: MIT ✅ (Full freedom)
Stars: 90k+

WHAT IT DOES:
- Run LLMs locally
- No API costs
- Complete privacy
- Supports many models

HOW WE USE:
- Optional "Privacy Pro" feature
- Local AI analysis
- No data leaves device

INSTALLATION:
- Download from ollama.ai
- Run as service

CODE EXAMPLE:
```python
import ollama

response = ollama.chat(
    model='llama3.2',
    messages=[{
        'role': 'user',
        'content': f'Analyze this productivity data: {data}'
    }]
)

print(response['message']['content'])
```
```

#### 17. Stripe
```
Repo: https://github.com/stripe/stripe-python
License: MIT ✅ (Full freedom)
Stars: 1.6k+

WHAT IT DOES:
- Payment processing
- Subscriptions
- Invoicing
- Webhooks

HOW WE USE:
- Pro tier subscriptions
- Team billing
- Payment management

INSTALLATION:
```bash
pip install stripe
npm install stripe @stripe/stripe-js
```

CODE EXAMPLE:
```python
import stripe

stripe.api_key = "sk_test_..."

# Create checkout session
session = stripe.checkout.Session.create(
    mode="subscription",
    payment_method_types=["card"],
    line_items=[{
        "price": "price_xxx",  # Your Pro plan price ID
        "quantity": 1,
    }],
    success_url="https://yourapp.com/success",
    cancel_url="https://yourapp.com/cancel",
)
```
```

---

## 📊 Summary Table

| Repository | Category | License | Usage | Modify? |
|------------|----------|---------|-------|---------|
| ActivityWatch | Core | MPL-2.0 | API | ❌ No |
| psutil | Core | BSD | Import | ✅ Yes |
| Tauri | Core | MIT | Framework | ✅ Yes |
| FastAPI | Core | MIT | Framework | ✅ Yes |
| shadcn/ui | UI | MIT | Copy/Paste | ✅ Yes |
| LangChain | AI | MIT | Import | ✅ Yes |
| Instructor | AI | MIT | Import | ✅ Yes |
| Supabase | Backend | Apache 2.0 | Service | ✅ Yes |
| Recharts | UI | MIT | Import | ✅ Yes |
| react-pdf | UI | MIT | Import | ✅ Yes |
| Framer Motion | UI | MIT | Import | ✅ Yes |
| Keyring | Security | MIT | Import | ✅ Yes |
| mss | Utility | MIT | Import | ✅ Yes |
| Zustand | State | MIT | Import | ✅ Yes |
| TanStack Query | Data | MIT | Import | ✅ Yes |
| Ollama | AI | MIT | Service | ✅ Yes |
| Stripe | Payment | MIT | Service | ✅ Yes |

---

## ⚖️ License Compliance

### What Each License Means

**MIT License:**
- ✅ Use commercially
- ✅ Modify
- ✅ Distribute
- ✅ Keep proprietary
- ℹ️ Include license notice

**BSD License:**
- Same as MIT basically

**Apache 2.0:**
- Same as MIT
- ℹ️ State changes if modified

**MPL-2.0 (Mozilla):**
- ✅ Use commercially
- ⚠️ If you modify MPL files, those files must be open-sourced
- ✅ Your own code stays proprietary
- ℹ️ Solution: Don't modify, use via API

### Our Strategy

```
OUR PROPRIETARY CODE:
├── Tauri app structure
├── React components (customized shadcn)
├── FastAPI routes
├── Business logic
├── UI/UX design
├── AI prompts and chains
└── Everything we write

OPEN SOURCE WE USE:
├── Libraries (import, don't modify)
├── Frameworks (use as intended)
├── APIs (consume data)
└── Components (shadcn = copy then customize)
```

---

## 🚀 Quick Start Commands

```bash
# Create project
mkdir productify-pro && cd productify-pro

# Initialize Tauri + React
npm create tauri-app@latest . -- --template react-ts

# Add shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card dialog input

# Python backend setup
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install fastapi uvicorn psutil langchain langchain-openai instructor keyring mss pillow

# Install ActivityWatch (separate download)
# https://activitywatch.net/downloads/

# Start development
npm run tauri dev
python -m uvicorn app.main:app --reload
```

---

*All repositories verified for commercial use. Last updated: January 2025*
