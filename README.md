# SliceForge 3D: Taylor Made Slicing 🛠️

**SliceForge 3D** is a powerful, cross-platform desktop application designed to bridge the gap between 3D modeling and 2D fabrication. It takes standard STL files and slices them into flat layers suitable for laser cutting, CNC routing, or cardboard prototyping.

It features a real-time 3D viewer, an automatic nesting algorithm to save material, and an AI assistant to help optimize your slicing strategy.

![App Screenshot](https://via.placeholder.com/800x450.png?text=Add+Your+Screenshot+Here)
*(Add a screenshot of your app here)*

## ✨ Key Features

*   **3D Visualization:** Interactive view of your model with a view cube, orbit controls, and wireframe inspection.
*   **Smart Slicing:**
    *   Slice along X, Y, or Z axes.
    *   Define slices by total count or specific layer height (mm/in).
    *   Real-time progress visualization.
*   **Assembly Preview:** Watch an animated, layer-by-layer assembly of your model to visualize how the physical parts fit together.
*   **Automatic Nesting:** Efficiently packs 2D slices onto material sheets to minimize waste using a Guillotine packing algorithm with auto-rotation.
*   **AI Assistant:** Integrated with Google Gemini 2.5 Flash to analyze your model's geometry and recommend the best slicing axis and parameters.
*   **Export Ready:** Generates clean, scale-accurate **DXF** and **SVG** files ready for laser cutters (LightBurn, Illustrator, AutoCAD).
*   **Model Transformation:** Scale, resize, and toggle between Metric (mm) and Imperial (inches) units.

## 🏗️ Tech Stack

*   **Core:** [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
*   **3D Engine:** [Three.js](https://threejs.org/) via [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
*   **Desktop Wrapper:** [Electron](https://www.electronjs.org/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **AI:** [Google Gemini API](https://ai.google.dev/)
*   **Algorithms:** Custom implementation of Mesh Slicing and 2D Bin Packing.

## 🚀 Installation & Usage

### Run Locally (Development)

1.  Clone the repository:
    ```bash
    git clone https://github.com/YOUR_USERNAME/SliceForge.git
    cd SliceForge
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the app:
    ```bash
    npm run electron:dev
    ```

### Build Installer (Windows/Mac)

To generate a standalone installer (`.exe` or `.dmg`):

```bash
npm run dist
