# IC HDL Generator

An educational platform for learning digital circuit design and HDL (Hardware Description Language) programming through interactive tools and visual design.

## 🌟 Features

- **Visual Circuit Designer**: Drag-and-drop interface for designing digital circuits
- **IC Database**: Comprehensive library of 74xx series TTL ICs
- **Boolean Logic Tool**: Convert boolean expressions to HDL code
- **HDL Generation**: Automatic Verilog and VHDL code generation
- **Save/Load**: Store and retrieve circuit designs
- **Educational**: Built-in tutorials and documentation

## 🚀 Quick Start

1. **Install Dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Initialize Database:**
   ```bash
   python seed_db.py
   ```

3. **Run the Server:**
   ```bash
   uvicorn main:app --reload
   ```

4. **Open Browser:**
   Navigate to `http://localhost:8000`

## 📚 Documentation

See [DOCUMENTATION.md](DOCUMENTATION.md) for comprehensive guides, tutorials, and API documentation.

## 🎓 Tutorials

### Tutorial 1: Your First Circuit
- Open the Circuit Designer
- Drag a 7408 (AND gate) onto the canvas
- Add switches and an LED
- Connect them with wires
- Export to HDL

### Tutorial 2: Boolean to HDL
- Navigate to Boolean Logic Tool
- Enter: `Y = A AND B`
- View truth table
- Generate Verilog/VHDL code

### Tutorial 3: Explore ICs
- Browse the IC Database
- Search for specific ICs (e.g., "7474")
- View specifications and pin configs
- Generate HDL for any IC

## 🔧 Technology Stack

- **Backend**: FastAPI (Python)
- **Frontend**: Vanilla JavaScript + Fabric.js
- **Database**: SQLite
- **Styling**: Tailwind CSS

## 📁 Project Structure

```
ic_hdl_generator/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── models.py            # Database models
│   ├── crud.py              # Database operations
│   ├── routers/             # API endpoints
│   ├── services/            # Business logic
│   ├── templates/           # HTML templates
│   ├── hdl_templates/       # HDL code templates
│   └── static/              # Static assets
├── DOCUMENTATION.md         # Full documentation
└── README.md               # This file
```

## 🎯 Use Cases

- **Students**: Learn digital design and HDL programming
- **Educators**: Teaching tool for digital logic courses
- **Hobbyists**: Quick HDL code generation
- **Prototyping**: Rapid circuit design and validation

## 🛠️ Features in Detail

### Circuit Designer
- 20+ supported IC types (74xx series, 555 timer)
- Realistic component graphics  
- Interactive wiring system
- Save/load functionality
- Export to Verilog/VHDL

### IC Database
- Searchable library
- Pin configuration diagrams
- Truth tables
- Logic behavior descriptions
- Instant HDL generation

### Boolean Logic Tool
- Expression parser
- Automatic truth table generation
- Support for AND, OR, NOT, XOR, NAND, NOR
- Multi-output support
- Verilog and VHDL output

## 📝 Example Workflows

### Workflow 1: Design a 4-bit Adder
1. Place four 7483 Full Adder ICs
2. Add switches for inputs
3. Add LEDs for outputs
4. Wire carry chain
5. Save as "4bit_adder"
6. Export HDL

### Workflow 2: Create State Machine
1. Use Boolean Logic Tool  
2. Define state transitions
3. Generate HDL
4. Import to simulation tool
5. Verify timing

## 🤝 Contributing

This is an educational project. Contributions welcome!

## 📄 License

This project is for educational purposes.

## 🙏 Acknowledgments

- Built with FastAPI framework
- Fabric.js for canvas rendering
- Tailwind CSS for styling
- Inspired by classic TTL logic design

## 📞 Support

For issues or questions:
- Check DOCUMENTATION.md
- Open an issue on GitHub
- Review the FAQ section

---

**Made with ❤️ for digital design education**
