# Riedel MediorNet & Pro-Bel Matrix Controller

An advanced, responsive, and web-based routing panel designed to interface with **Riedel MediorNet** matrices (via **Ember+** protocol) and legacy/secondary matrices (via **Pro-Bel SWP-08** protocol).

This controller provides an interactive, color-coded grid representing a sub-matrix of inputs and outputs, customizable on-the-fly, with support for advanced scene memories, automatic scheduling, and a tablet-optimized layout.

---

## Technical Architecture Overview

- **Backend:** Node.js server using Express, Socket.io, `emberplus-connection`, and `probel-swp-08`. It establishes active connections with the matrix devices, polls routing states, and broadcasts live updates to all connected clients.
- **Frontend:** Vanilla HTML5, CSS3, and JavaScript web panel. Real-time updates are pushed via WebSockets (Socket.io) to ensure multiple open sessions (e.g., PC panel and Tablet) stay perfectly in sync.
- **Standalone Package:** Compilable into a portable single-binary executable (`.exe`) for Windows using `pkg`.

---

## User Guide & Key Features

### 1. Interactive Routing Grid
- The main panel features a dynamic grid showing a customizable set of inputs (rows) and outputs (columns).
- **Green Crosspoints:** Represent an active connection between that input and output.
- **Blue Crosspoints (Selected):** Clicking a crosspoint selects it. You can select multiple crosspoints by holding `Ctrl` (or `Cmd` on Mac) while clicking.
- **Executing a Route:** Click `TAKE` on the top bar to apply the selected routes to the live matrix.

### 2. Custom Layout Management
Instead of navigating hundreds of matrix ports, you can build custom layout configurations:
- **Creating a Layout:** Enter a name in the *Layout Management* input box, specify the number of inputs/outputs, and click **Save**.
- **Loading a Layout:** Choose a layout from the dropdown and click **Load**. The grid will dynamically resize and update its port mappings.
- **Import/Export:** Layouts are saved on the server inside `layouts.json`, but they can be exported to your PC as a backup JSON file or imported from another controller.

### 3. Drag & Drop Customization & Deletion
You can rearrange or shrink your routing matrix directly from the grid:
- **Reordering Ports:** Grab the small drag handles on the left of row labels (inputs) or top of column headers (outputs) and drag them to swap their order in the grid.
- **Deleting Ports:** Drag any row label or column header and drop it onto the **Trash Can icon (🗑️)** in the top action bar to remove that port from the current layout.
- **Alphabetical Sorting (A-Z):** Click the `A-Z` button to instantly sort the source/destination dropdown selection lists alphabetically.

### 4. Scene Memories / Snapshots (with Live Preview & Tweak)
The snapshot system is designed with a "Safety Preview" workflow to prevent accidental routing mistakes.
- **Saving a Snapshot:** Arrange the matrix to your desired state. In the *Snapshots* sidebar section, type a name and click **Save State**.
- **Recalling a Snapshot (Live Preview):**
  1. Select a snapshot from the dropdown and click **Recall State**.
  2. The target routing changes will glow in **Orange/Amber** on the grid. **No connections are made on the physical matrix yet.**
  3. The `TAKE` button turns orange and changes to **TAKE SNAPSHOT**.
- **Live Tweaking (Editing in-flight):** While the orange preview is active, you can click on the grid to add, remove, or modify crosspoints before sending. The adjustments instantly join the orange preview.
- **Applying the Snapshot:** Click the orange **TAKE SNAPSHOT** button. All connections will execute on the matrix simultaneously.
- **Canceling the Preview:** Click **UNDO** to clear the orange preview and return to the active live matrix view.
- **Bouncing Protection:** The system implements a 3-second optimistic state-lock after a snapshot execution. This prevents the grid from briefly "bouncing" back to the old state while waiting for the physical matrix to update and report back.

### 5. Custom Color Coding
To easily group and identify related signals:
- Hover over any input row label or output column header to reveal two color pickers.
- Click the left picker to change the **background color** of the label.
- Click the right picker to change the **text color** of the label.
- Selecting multiple ports using `Ctrl` allows you to apply colors to all of them at once.

### 6. Automated Scheduler (Auto-Take)
You can automate future routing switches:
- Select an output, input, and specify a target time (HH:MM).
- Click **Add Auto-Take**.
- 30 seconds before execution, the top bar turns red and flashes a warning countdown. 
- You can click **Abort** at any point during the countdown to cancel the scheduled route.

### 7. Tablet-Optimized Interface (`tablet.html`)
Access the panel by clicking the **Tablet Panel 📱** button in the header or navigating directly to `http://localhost:3556/tablet.html`.
- **Sidebar Navigation:** A collapsable sidebar (click **☰** to toggle) lists your saved layouts as Quick Buttons for fast switching.
- **Full Screen Toggle:** Toggle full screen mode to maximize grid visibility.
- **Responsive Layout:** The grid and action controls are touch-friendly and resized specifically for tablets.
- **Snapshot Integration:** Save and recall snapshots with the exact same orange preview/live tweak workflow as the desktop view.

---

## Installation & Deployment

### Prerequisites
- Node.js (v18 recommended)

### Run in Development
```bash
# Install dependencies
npm install

# Start the application
node server.js
```
Then open `http://localhost:3556` in your web browser.

### Compile standing executable (.exe)
To package the app into a standalone Windows executable:
```bash
# Run the build script
npm run build
```
This generates `Riedel_Controller_v69_by_NIS.exe` which contains the node environment, server code, and frontend assets packaged into a single file. You can run it on any Windows PC without having Node.js installed.
