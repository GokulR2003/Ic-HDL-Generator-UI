import re

class BooleanExpressionParser:
    """Parser for boolean expressions"""
    
    def __init__(self):
        self.alternative_symbols = {
            '+': '|',
            '*': '&',
            '~': '!',
            'and': '&',
            'or': '|',
            'xor': '^',
            'not': '!'
        }
    
    def parse(self, expression):
        """Parse boolean expression and extract variables"""
        # Normalize expression
        expr = expression.strip()
        
        # Replace alternative symbols
        for alt, std in self.alternative_symbols.items():
            expr = expr.replace(alt, std)
        
        # Remove spaces
        expr = expr.replace(' ', '')
        
        # Validate expression
        if not self._validate_expression(expr):
            return {"error": f"Invalid boolean expression: {expression}"}
        
        # Extract variables (single letters, uppercase/lowercase)
        variables = sorted(set([c for c in expr if c.isalpha()]))
        
        if not variables:
            return {"error": "No variables found in expression"}
        
        # Create truth table (for up to 6 variables)
        if len(variables) <= 6:
            truth_table = self._generate_truth_table(expr, variables)
        else:
            truth_table = "Too many variables for truth table display"
        
        # Simplify using basic boolean algebra (placeholder for now)
        simplified = expr 
        
        return {
            "original": expression,
            "normalized": expr,
            "variables": variables,
            "num_inputs": len(variables),
            "simplified": simplified,
            "truth_table": truth_table,
            "verilog_expr": self._to_verilog(expr),
            "vhdl_expr": self._to_vhdl(expr)
        }
    
    def _validate_expression(self, expr):
        """Basic validation of boolean expression"""
        # Check for valid characters
        pattern = r'^[A-Za-z01!&|^()]+$'
        if not re.match(pattern, expr):
            return False
        
        # Check parentheses balance
        stack = []
        for char in expr:
            if char == '(':
                stack.append(char)
            elif char == ')':
                if not stack:
                    return False
                stack.pop()
        
        return len(stack) == 0
    
    def _generate_truth_table(self, expr, variables):
        """Generate truth table for expression"""
        table = []
        n = len(variables)
        
        try:
            for i in range(2**n):
                # Create variable assignment
                assignment = {}
                for j, var in enumerate(variables):
                    assignment[var] = (i >> (n - j - 1)) & 1
                
                # Evaluate expression
                result = self._evaluate_expression(expr, assignment)
                
                # Add to table
                row = {**assignment, 'output': result}
                table.append(row)
        except Exception:
             # Fallback if evaluation fails
             return []
        
        return table
    
    def _evaluate_expression(self, expr, assignment):
        """Evaluate boolean expression with given variable values"""
        # Replace variables with their values
        eval_expr = expr
        for var, value in assignment.items():
            eval_expr = eval_expr.replace(var, str(value))
        
        # Evaluate using Python's eval (safe since we've validated)
        try:
            # Replace boolean operators with Python operators
            eval_expr = eval_expr.replace('!', ' not ')
            eval_expr = eval_expr.replace('&', ' and ')
            eval_expr = eval_expr.replace('|', ' or ')
            eval_expr = eval_expr.replace('^', ' ^ ')
            
            # Add parentheses for precedence safety
            eval_expr = f"({eval_expr})"
            
            # Safe eval with no builtins
            result = eval(eval_expr, {"__builtins__": {}}, {})
            return 1 if result else 0
        except:
            return 0
    
    def _to_verilog(self, expr):
        """Convert to Verilog syntax"""
        verilog_expr = expr.replace('!', '~')
        verilog_expr = verilog_expr.replace('&', ' & ')
        verilog_expr = verilog_expr.replace('|', ' | ')
        verilog_expr = verilog_expr.replace('^', ' ^ ')
        return verilog_expr
    
    def _to_vhdl(self, expr):
        """Convert to VHDL syntax"""
        vhdl_expr = expr.replace('!', 'not ')
        vhdl_expr = vhdl_expr.replace('&', ' and ')
        vhdl_expr = vhdl_expr.replace('|', ' or ')
        vhdl_expr = vhdl_expr.replace('^', ' xor ')
        return vhdl_expr
