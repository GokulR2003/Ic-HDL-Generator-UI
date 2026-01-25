import os

# Base paths
BASE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "hdl_templates", "vhdl")
COMB_DIR = os.path.join(BASE_DIR, "combinational")
SEQ_DIR = os.path.join(BASE_DIR, "sequential")
SPECIAL_DIR = os.path.join(BASE_DIR, "special")

# Ensure directories exist
for d in [
    os.path.join(COMB_DIR, "decoders"),
    os.path.join(COMB_DIR, "encoders"),
    os.path.join(COMB_DIR, "multiplexers"),
    os.path.join(COMB_DIR, "comparators"),
    os.path.join(COMB_DIR, "transceivers"),
    os.path.join(SEQ_DIR, "flip_flops"),
    os.path.join(SEQ_DIR, "counters"),
    os.path.join(SPECIAL_DIR, "timers"),
    os.path.join(SPECIAL_DIR, "multivibrators"),
]:
    os.makedirs(d, exist_ok=True)

# Common Helper strings
HEADER = """-- ============================================================================
-- Auto-generated VHDL from IC Metadata
-- Part: {{part_number}} - {{ic_name}}
-- Generated: {{timestamp}}
-- ============================================================================

library IEEE;
use IEEE.STD_LOGIC_1164.ALL;
use IEEE.NUMERIC_STD.ALL;

entity IC_{{part_number}} is
    Port (
        {% for input in ports.inputs %}
        {{input}} : in STD_LOGIC;
        {% endfor %}
        
        {% for output in ports.outputs %}
        {{output}} : out STD_LOGIC;
        {% endfor %}
        
        {% for bidir in ports.bidirectional %}
        {{bidir}} : inout STD_LOGIC;
        {% endfor %}
        
        {% for power in ports.power %}
        {{power}} : in STD_LOGIC
        {% if not loop.last %};{% else %};{% endif %}
        {% endfor %}
    );
end IC_{{part_number}};

architecture Behavioral of IC_{{part_number}} is
"""

FOOTER = """
end Behavioral;
"""

# Template Definitions
TEMPLATES = {
    # 7474 D-Flip Flop
    os.path.join(SEQ_DIR, "flip_flops", "d_ff_dual_async.vhdltpl"): """
    signal q1_reg, q1_n_reg : STD_LOGIC;
    signal q2_reg, q2_n_reg : STD_LOGIC;
begin
    -- Flip-Flop 1
    process(PRE1_n, CLR1_n, CLK1)
    begin
        if (PRE1_n = '0' and CLR1_n = '1') then
            q1_reg <= '1';
        elsif (CLR1_n = '0' and PRE1_n = '1') then
            q1_reg <= '0';
        elsif (CLR1_n = '0' and PRE1_n = '0') then
            -- Unstable state behavior varies; model as high logic for both
            q1_reg <= '1'; 
        elsif rising_edge(CLK1) then
            q1_reg <= D1;
        end if;
    end process;
    
    Q1 <= q1_reg;
    Q1_n <= not q1_reg;

    -- Flip-Flop 2
    process(PRE2_n, CLR2_n, CLK2)
    begin
        if (PRE2_n = '0' and CLR2_n = '1') then
            q2_reg <= '1';
        elsif (CLR2_n = '0' and PRE2_n = '1') then
            q2_reg <= '0';
        elsif (CLR2_n = '0' and PRE2_n = '0') then
            q2_reg <= '1';
        elsif rising_edge(CLK2) then
            q2_reg <= D2;
        end if;
    end process;

    Q2 <= q2_reg;
    Q2_n <= not q2_reg;
""",

    # 7476 JK Flip Flop
    os.path.join(SEQ_DIR, "flip_flops", "jk_ff_dual.vhdltpl"): """
    signal q1_reg : STD_LOGIC := '0';
    signal q2_reg : STD_LOGIC := '0';
begin
    -- Flip-Flop 1
    process(CLK1, PRE1_n, CLR1_n)
    begin
        if (PRE1_n = '0') then
            q1_reg <= '1';
        elsif (CLR1_n = '0') then
            q1_reg <= '0';
        elsif falling_edge(CLK1) then
            if (J1 = '0' and K1 = '0') then
                q1_reg <= q1_reg;
            elsif (J1 = '0' and K1 = '1') then
                q1_reg <= '0';
            elsif (J1 = '1' and K1 = '0') then
                q1_reg <= '1';
            elsif (J1 = '1' and K1 = '1') then
                q1_reg <= not q1_reg;
            end if;
        end if;
    end process;
    
    Q1 <= q1_reg;
    Q1_n <= not q1_reg;

    -- Flip-Flop 2
    -- Note: Pin 7 is mapped to PRE2_n in this IC definition usually
    process(CLK2, PRE2_n, CLR2_n)
    begin
        if (PRE2_n = '0') then
            q2_reg <= '1';
        elsif (CLR2_n = '0') then
            q2_reg <= '0';
        elsif falling_edge(CLK2) then
            if (J2 = '0' and K2 = '0') then
                q2_reg <= q2_reg;
            elsif (J2 = '0' and K2 = '1') then
                q2_reg <= '0';
            elsif (J2 = '1' and K2 = '0') then
                q2_reg <= '1';
            elsif (J2 = '1' and K2 = '1') then
                q2_reg <= not q2_reg;
            end if;
        end if;
    end process;
    
    Q2 <= q2_reg;
    Q2_n <= not q2_reg;
""",
    
    # 74138 3-to-8 Decoder
    os.path.join(COMB_DIR, "decoders", "decoder_3to8.vhdltpl"): """
    signal enable : STD_LOGIC;
    signal select_in : STD_LOGIC_VECTOR(2 downto 0);
begin
    enable <= G1 and (not G2A_n) and (not G2B_n);
    select_in <= C & B & A;
    
    process(enable, select_in)
    begin
        Y0_n <= '1'; Y1_n <= '1'; Y2_n <= '1'; Y3_n <= '1';
        Y4_n <= '1'; Y5_n <= '1'; Y6_n <= '1'; Y7_n <= '1';
        
        if enable = '1' then
            case select_in is
                when "000" => Y0_n <= '0';
                when "001" => Y1_n <= '0';
                when "010" => Y2_n <= '0';
                when "011" => Y3_n <= '0';
                when "100" => Y4_n <= '0';
                when "101" => Y5_n <= '0';
                when "110" => Y6_n <= '0';
                when "111" => Y7_n <= '0';
                when others => null;
            end case;
        end if;
    end process;
""",

    # 74139 Dual 2-to-4 Decoder
    os.path.join(COMB_DIR, "decoders", "decoder_2to4_dual.vhdltpl"): """
begin
    -- Decoder 1
    process(G1_n, A1, B1)
    begin
        Y1_0_n <= '1'; Y1_1_n <= '1'; Y1_2_n <= '1'; Y1_3_n <= '1';
        if G1_n = '0' then
            if    (B1='0' and A1='0') then Y1_0_n <= '0';
            elsif (B1='0' and A1='1') then Y1_1_n <= '0';
            elsif (B1='1' and A1='0') then Y1_2_n <= '0';
            elsif (B1='1' and A1='1') then Y1_3_n <= '0';
            end if;
        end if;
    end process;

    -- Decoder 2
    process(G2_n, A2, B2)
    begin
        Y2_0_n <= '1'; Y2_1_n <= '1'; Y2_2_n <= '1'; Y2_3_n <= '1';
        if G2_n = '0' then
            if    (B2='0' and A2='0') then Y2_0_n <= '0';
            elsif (B2='0' and A2='1') then Y2_1_n <= '0';
            elsif (B2='1' and A2='0') then Y2_2_n <= '0';
            elsif (B2='1' and A2='1') then Y2_3_n <= '0';
            end if;
        end if;
    end process;
""",

    # 74153 Dual 4:1 Mux
    os.path.join(COMB_DIR, "multiplexers", "mux_4to1_dual.vhdltpl"): """
begin
    -- Mux 1
    process(G1_n, S1, S0, I1a, I1b, I1c, I1d)
    begin
        if G1_n = '1' then
            Y1 <= '0';
        else
            case (S1 & S0) is
                when "00" => Y1 <= I1a;
                when "01" => Y1 <= I1b;
                when "10" => Y1 <= I1c;
                when "11" => Y1 <= I1d;
                when others => Y1 <= '0';
            end case;
        end if;
    end process;

    -- Mux 2
    process(G2_n, S1, S0, I2a, I2b, I2c, I2d)
    begin
        if G2_n = '1' then
            Y2 <= '0';
        else
            case (S1 & S0) is
                when "00" => Y2 <= I2a;
                when "01" => Y2 <= I2b;
                when "10" => Y2 <= I2c;
                when "11" => Y2 <= I2d;
                when others => Y2 <= '0';
            end case;
        end if;
    end process;
""",

    # 74147 Priority Encoder
    os.path.join(COMB_DIR, "encoders", "encoder_prio_10to4.vhdltpl"): """
begin
    process(in1_n, in2_n, in3_n, in4_n, in5_n, in6_n, in7_n, in8_n, in9_n)
    begin
        -- Default (Active Low Logic)
        outA_n <= '1'; outB_n <= '1'; outC_n <= '1'; outD_n <= '1';
        
        if in9_n = '0' then
            outA_n <= '0'; outB_n <= '1'; outC_n <= '1'; outD_n <= '0'; -- 9 (1001) -> Inverse 0110
        elsif in8_n = '0' then
            outA_n <= '1'; outB_n <= '1'; outC_n <= '1'; outD_n <= '0'; -- 8 (1000)
        elsif in7_n = '0' then
            outA_n <= '0'; outB_n <= '0'; outC_n <= '0'; outD_n <= '1'; -- 7
        elsif in6_n = '0' then
            outA_n <= '1'; outB_n <= '0'; outC_n <= '0'; outD_n <= '1';
        elsif in5_n = '0' then
            outA_n <= '0'; outB_n <= '1'; outC_n <= '0'; outD_n <= '1';
        elsif in4_n = '0' then
            outA_n <= '1'; outB_n <= '1'; outC_n <= '0'; outD_n <= '1';
        elsif in3_n = '0' then
            outA_n <= '0'; outB_n <= '0'; outC_n <= '1'; outD_n <= '1';
        elsif in2_n = '0' then
            outA_n <= '1'; outB_n <= '0'; outC_n <= '1'; outD_n <= '1';
        elsif in1_n = '0' then
            outA_n <= '0'; outB_n <= '1'; outC_n <= '1'; outD_n <= '1';
        else
            -- No input active (all 1)
            outA_n <= '1'; outB_n <= '1'; outC_n <= '1'; outD_n <= '1';
        end if;
    end process;
""",

    # 7485 Comparator
    os.path.join(COMB_DIR, "comparators", "mag_comparator_4bit.vhdltpl"): """
begin
    process(A3, A2, A1, A0, B3, B2, B1, B0, IA_lt_B, IA_eq_B, IA_gt_B)
        variable A_val : unsigned(3 downto 0);
        variable B_val : unsigned(3 downto 0);
    begin
        A_val := unsigned'(A3 & A2 & A1 & A0);
        B_val := unsigned'(B3 & B2 & B1 & B0);
        
        OA_lt_B <= '0'; OA_eq_B <= '0'; OA_gt_B <= '0';
        
        if A_val > B_val then
            OA_gt_B <= '1';
        elsif A_val < B_val then
            OA_lt_B <= '1';
        else
            -- Equal, check cascade inputs
            if IA_gt_B = '1' then
                OA_gt_B <= '1';
            elsif IA_lt_B = '1' then
                OA_lt_B <= '1';
            else
                OA_eq_B <= '1';
            end if;
        end if;
    end process;
""",

    # 7447 BCD Decoder
    os.path.join(COMB_DIR, "decoders", "bcd_to_7seg.vhdltpl"): """
    signal bcd_in : STD_LOGIC_VECTOR(3 downto 0);
    signal segments : STD_LOGIC_VECTOR(6 downto 0); -- a to g
begin
    bcd_in <= D & C & B & A;
    
    -- Logic for segs (active low)
    process(bcd_in, LT_n, RBI_n, BI_RBO_n)
    begin
        -- Simplified logic (needs full truth table implementation for proper RBI/RBO handling)
        -- Assuming standard operation for visibility
        
        if LT_n = '0' then
            segments <= "0000000"; -- All on
        elsif BI_RBO_n = '0' then   -- Blanking Input
            segments <= "1111111"; -- All off
        else
            case bcd_in is
                when "0000" => segments <= "0000001"; -- 0
                when "0001" => segments <= "1001111"; -- 1
                when "0010" => segments <= "0010010"; -- 2
                when "0011" => segments <= "0000110"; -- 3
                when "0100" => segments <= "1001100"; -- 4
                when "0101" => segments <= "0100100"; -- 5
                when "0110" => segments <= "0100000"; -- 6
                when "0111" => segments <= "0001111"; -- 7
                when "1000" => segments <= "0000000"; -- 8
                when "1001" => segments <= "0000100"; -- 9
                when others => segments <= "1111111"; -- Blank invalid
            end case;
        end if;
    end process;

    a_out <= segments(6);
    b_out <= segments(5);
    c_out <= segments(4);
    d_out <= segments(3);
    e_out <= segments(2);
    f_out <= segments(1);
    g_out <= segments(0);
""",

    # 74245 Transceiver
    os.path.join(COMB_DIR, "transceivers", "octal_transceiver.vhdltpl"): """
begin
    process(DIR, G_n, A1, A2, A3, A4, A5, A6, A7, A8, B1, B2, B3, B4, B5, B6, B7, B8)
    begin
        -- Initiate High-Z
        A1 <= 'Z'; A2 <= 'Z'; A3 <= 'Z'; A4 <= 'Z'; A5 <= 'Z'; A6 <= 'Z'; A7 <= 'Z'; A8 <= 'Z';
        B1 <= 'Z'; B2 <= 'Z'; B3 <= 'Z'; B4 <= 'Z'; B5 <= 'Z'; B6 <= 'Z'; B7 <= 'Z'; B8 <= 'Z';
        
        if G_n = '0' then
            if DIR = '1' then
                -- A to B
                B1 <= A1; B2 <= A2; B3 <= A3; B4 <= A4; B5 <= A5; B6 <= A6; B7 <= A7; B8 <= A8;
            else
                -- B to A
                A1 <= B1; A2 <= B2; A3 <= B3; A4 <= B4; A5 <= B5; A6 <= B6; A7 <= B7; A8 <= B8;
            end if;
        end if;
    end process;
""",

    # 7490 Decade Counter
    os.path.join(SEQ_DIR, "counters", "counter_decade_7490.vhdltpl"): """
    signal count_q : unsigned(3 downto 0) := "0000";
begin
    process(CP0, MR1, MR2, MS1, MS2)
    begin
        if (MS1 = '1' and MS2 = '1') then
            count_q <= "1001"; -- Set to 9
        elsif (MR1 = '1' and MR2 = '1') then
            count_q <= "0000"; -- Reset to 0
        elsif falling_edge(CP0) then
            -- BCD Decade logic simplified
            if count_q = "1001" then
                count_q <= "0000";
            else
                count_q <= count_q + 1;
            end if;
        end if;
    end process;
    
    Q0 <= count_q(0);
    Q1 <= count_q(1);
    Q2 <= count_q(2);
    Q3 <= count_q(3);
""",

    # 7493 4-bit Binary Counter
    os.path.join(SEQ_DIR, "counters", "counter_4bit_binary_7493.vhdltpl"): """
    signal count_val : unsigned(3 downto 0) := "0000";
begin
    -- Simplified model treating as single 4-bit synchronous for simulation viz
    -- Real 7493 is ripple with CP0->Q0 and CP1->Q1-3 separately.
    
    process(CP0, MR1, MR2)
    begin
        if (MR1 = '1' and MR2 = '1') then
            count_val <= "0000";
        elsif falling_edge(CP0) then
             count_val <= count_val + 1;
        end if;
    end process;
    
    Q0 <= count_val(0);
    Q1 <= count_val(1);
    Q2 <= count_val(2);
    Q3 <= count_val(3);
""",

    # 4017 Decade Counter
    os.path.join(SEQ_DIR, "counters", "counter_decade_4017.vhdltpl"): """
    signal count : integer range 0 to 9 := 0;
begin
    process(CLK, RST)
    begin
        if RST = '1' then
            count <= 0;
        elsif rising_edge(CLK) then
            if EN_n = '0' then
                if count = 9 then
                    count <= 0;
                else
                    count <= count + 1;
                end if;
            end if;
        end if;
    end process;
    
    Q0 <= '1' when count = 0 else '0';
    Q1 <= '1' when count = 1 else '0';
    Q2 <= '1' when count = 2 else '0';
    Q3 <= '1' when count = 3 else '0';
    Q4 <= '1' when count = 4 else '0';
    Q5 <= '1' when count = 5 else '0';
    Q6 <= '1' when count = 6 else '0';
    Q7 <= '1' when count = 7 else '0';
    Q8 <= '1' when count = 8 else '0';
    Q9 <= '1' when count = 9 else '0';
    
    CO_n <= '0' when count >= 5 else '1';
""",
    
    # 555 Timer
    os.path.join(SPECIAL_DIR, "timers", "timer_555.vhdltpl"): """
begin
    -- Behavioral model only
    process(TRIG_n, THRES, RST_n)
    begin
        if RST_n = '0' then
            OUT_PIN <= '0';
            DISCH <= '0';
        else
            if TRIG_n = '0' then
                OUT_PIN <= '1'; -- Trigger set
                DISCH <= '1';
            elsif THRES = '1' then
                OUT_PIN <= '0'; -- Threshold reset
                DISCH <= '0';
            end if;
        end if;
    end process;
""",

    # 74121 Monostable
    os.path.join(SPECIAL_DIR, "multivibrators", "mono_74121.vhdltpl"): """
begin
    -- Behavioral stub
    process(A1_n, A2_n, B)
    begin
       -- Trigger logic: (A1_n=0 or A2_n=0) and rising B
       -- Q pulse width determined by external R/C (not modeled in HDL synthesis directly)
       
       if ((A1_n = '0' or A2_n = '0') and rising_edge(B)) then
            Q <= '1';
            Q_n <= '0';
       else
            -- Default state (idealized)
            Q <= '0';
            Q_n <= '1';
       end if;
    end process;
"""
}

def generate_files():
    for filepath, body in TEMPLATES.items():
        content = HEADER + body + FOOTER
        
        # 555 and special need clean port names
        if "555" in filepath:
             content = content.replace("OUT_PIN", "OUT_555") # Avoid keyword conflicts if any
             
        with open(filepath, "w") as f:
            f.write(content)
        print(f"Generated {filepath}")

if __name__ == "__main__":
    generate_files()
