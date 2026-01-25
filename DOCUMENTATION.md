# IC HDL Generator - Documentation

## Overview

IC HDL Generator is an educational platform for learning digital circuit design and HDL (Hardware Description Language) programming. It provides interactive tools to design circuits visually, work with boolean logic, and generate production-ready Verilog/VHDL code.

## Platform Components

### 1. Visual Circuit Designer
**URL:** `/designer`

The Circuit Designer is a drag-and-drop canvas where you can:
- Add components (74xx series ICs, switches, LEDs)
- Wire components together
- Save and load circuit designs
- Export to Verilog or VHDL

**Key Features:**
- **Drag & Drop:** Simply drag components from the sidebar onto the canvas
- **Wire Mode:** Click the wire tool, then click two pins to connect them
- **Save/Load:** Store your designs in the database for later use
- **Export:** Generate synthesizable HDL code from your visual design

**How to Use:**
1. Open the Circuit Designer
2. Drag components (ICs, switches, LEDs) from the left sidebar
3. Click the "🔗 Wire" tool in the toolbar
4. Click on two pins to create a wire connection
5. Use "💾 Save" to store your design
6. Use "Export HDL" to generate Verilog/VHDL code

### 2. IC Database Browser
**URL:** `/ics-view`

Browse the comprehensive database of 74xx series TTL logic ICs:
- Search by part number or function
- View detailed specifications
- See pin configurations and truth tables
- Generate HDL code for individual ICs

**Supported IC Families:**
- Basic gates (7400, 7402, 7404, 7408, 7432, 7486)
- Flip-flops (7474, 7476)
- Multiplexers/Decoders (74138, 74139, 74153)
- Counters (7490, 7493)
- Timers (555)
- And many more!

### 3. Boolean Logic Tool
**URL:** `/boolean/tool`

Convert boolean expressions directly to HDL:
- Enter expressions like `Y = A AND B OR C`
- View auto-generated truth tables
- Get Verilog and VHDL implementations
- Understand the synthesis process

**Supported Operators:**
- `AND`, `OR`, `NOT`, `XOR`, `NAND`, `NOR`, `XNOR`
- Parentheses for grouping
- Multiple output expressions

## Tutorials

### Tutorial 1: Design a Simple AND Gate Circuit

**Objective:** Learn the basics of the circuit designer by creating a 2-input AND gate.

**Steps:**
1. Navigate to `/designer`
2. From the sidebar, drag a "7408" (Quad 2-input AND gate) IC onto the canvas
3. Drag two "Switch Input" components onto the canvas (these are your inputs)
4. Drag one "LED Output" component (this is your output)
5. Click the **Wire Mode** button (🔗) in the toolbar
6. Connect the switches to pins 1 and 2 of the 7408 (input pins of first AND gate)
7. Connect pin 3 of the 7408 (output of first AND gate) to the LED
8. Click **💾 Save** and name your circuit "AND_Gate_Demo"
9. Click **Export HDL** to generate Verilog code

**What You Learned:**
- How to place components
- How to use wire mode
- How to save designs
- How to export HDL

### Tutorial 2: Boolean Expression to HDL

**Objective:** Convert a boolean expression to HDL code.

**Steps:**
1. Navigate to `/boolean/tool`
2. In the expression field, enter: `Y = (A AND B) OR (C AND NOT D)`
3. Click **Generate HDL**
4. View the automatically generated truth table
5. See the Verilog implementation
6. Switch to VHDL tab to see VHDL code
7. Download the code using the download button

**What You Learned:**
- Boolean expression syntax
- Truth table generation
- HDL translation process
- Differences between Verilog and VHDL

### Tutorial 3: Working with IC Database

**Objective:** Explore IC specifications and generate component HDL.

**Steps:**
1. Navigate to `/ics-view`
2. Search for "7474" (Dual D Flip-Flop)
3. Click on the 7474 entry to view details
4. Study the pin configuration diagram
5. Read the logic behavior description
6. Click **Generate HDL** to see Verilog implementation
7. Try searching for other ICs like "555" or "7490"

**What You Learned:**
- How to find IC specifications
- Understanding pin configurations
- Reading truth tables
- IC-specific HDL generation

## Best Practices

### Circuit Design
1. **Plan First:** Sketch your circuit on paper before using the designer
2. **Organize Layout:** Keep inputs on the left, outputs on the right
3. **Label Everything:** Use descriptive names when saving circuits
4. **Save Often:** Use the save feature frequently to avoid losing work

###HDL Generation
1. **Verify Logic:** Always check your circuit logic before exporting
2. **Choose Appropriate Language:** Use Verilog for most FPGA/ASIC tools
3. **Module Naming:** Use descriptive, lowercase module names with underscores
4. **Test Generated Code:** Always simulate the generated HDL

### Boolean Expressions
1. **Use Parentheses:** Make operator precedence explicit
2. **Keep It Simple:** Break complex expressions into multiple outputs
3. **Verify Truth Table:** Check the auto-generated truth table matches expectations

## FAQ

**Q: Can I simulate circuits in the designer?**
A: Simulation is planned for a future update. Currently, you can export HDL and use external simulators like Icarus Verilog or ModelSim.

**Q: What IC families are supported?**
A: Currently 74xx TTL series and 555 timer. More families will be added.

**Q: Can I import my own IC definitions?**
A: This feature is planned for future releases.

**Q: Is the generated HDL synthesizable?**
A: Yes! All generated code is designed to be synthesis-ready for FPGA/ASIC tools.

**Q: Can I share my circuit designs?**
A: Circuits are saved locally to your database. Export functionality for sharing is coming soon.

## Keyboard Shortcuts

- **Delete:** Remove selected component
- **Ctrl+S:** Save circuit (when implemented)
- **Esc:** Cancel wire drawing

## Getting Help

If you encounter issues:
1. Check the browser console for error messages (F12)
2. Ensure you're using a modern browser (Chrome, Firefox, Edge)
3. Try refreshing the page
4. Clear the canvas and start fresh

## Technical Details

### Supported HDL Languages
- **Verilog:** Industry standard, widely used in FPGA design
- **VHDL:** Common in aerospace/defense, more verbose

### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+ (limited testing)

### Technology Stack
- **Backend:** FastAPI (Python)
- **Frontend:** Vanilla JavaScript + Fabric.js
- **Database:** SQLite
- **Styling:** Tailwind CSS

---

**Version:** 1.0.0  
**Last Updated:** January 2026
