# Tedifici

**Tedifici** is a modern web application that provides official, historical, and urban planning data for any building in Spain. It leverages the Spanish Catastro API for data retrieval and Google Gemini AI for historical context.

## Features

- **Address Search**: Smart autocomplete using OpenStreetMap.
- **Cadastral Data**: Retrieves the official Cadastral Reference (RC).
- **Building Details**: Displays Year of Construction, Surface Area, and Main Use.
- **Map Visualization**: Interactive map centered on the property.
- **AI Insights**: Generates a historical and architectural summary using AI.
- **Responsive Design**: Clean, modern UI built with Next.js and Tailwind CSS.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/tedifici.git
    cd tedifici
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**:
    Create a `.env.local` file in the root directory and add your Google Gemini API Key:
    ```bash
    GOOGLE_API_KEY=your_google_api_key_here
    ```

4.  Run the development server:
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser.

## Deployment / Distribution

### Desktop App (Windows) - RECOMMENDED
We have created a script to generate a standalone Windows application folder.

1.  **Build the App**:
    ```powershell
    # 1. Prepare static assets for packaging
    Copy-Item -Path "public" -Destination ".next/standalone/public" -Recurse -Force
    Copy-Item -Path ".next/static" -Destination ".next/standalone/.next/static" -Recurse -Force

    # 2. Build the App
    .\node_modules\.bin\electron-packager.cmd . Tedifici --platform=win32 --arch=x64 --out=dist-packager --overwrite --prune=true
    ```

2.  **Locate the Executable**:
    Go to `dist-packager/Tedifici-win32-x64/` folder.
    Run `Tedifici.exe`.

    **Important**: You must manually copy the `.env.local` file into `dist-packager/Tedifici-win32-x64/resources/app/` for the AI features to work.

### Using Docker (Alternative)

1.  **Build the Image**:
    ```bash
    docker build -t tedifici .
    ```

2.  **Run the Container**:
    You need to pass the API key when running the container:
    ```bash
    docker run -p 3000:3000 -e GOOGLE_API_KEY=your_api_key_here tedifici
    ```

    The app will be available at `http://localhost:3000`.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Maps**: Leaflet / React-Leaflet
- **AI**: Google Generative AI (Gemini Pro)
- **External Data**:
    - Nominatim (OpenStreetMap) - Geocoding
    - Sede Electrónica del Catastro - Building Data

## Troubleshooting

### Windows PowerShell: "Execution of scripts is disabled"

If you see an error like `cannot be loaded because running scripts is disabled on this system`, it is due to Windows PowerShell security policies.

**Solution 1 (Recommended for current session):**
Run this command in your terminal before running npm:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

**Solution 2:**
Use the Command Prompt (`cmd`) version of npm explicitly:
```powershell
npm.cmd run dev
```

## License

MIT
