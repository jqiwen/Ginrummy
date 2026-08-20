

export function decimalToDozenal(decimal: number): string {
    const dozenalDigits = "0123456789\u218A\u218B";
    let result = "";
  
    if (decimal === 0) return "0";
  
    while (decimal > 0) {
      const remainder = decimal % 12;
      result = dozenalDigits[remainder] + result;
      decimal = Math.floor(decimal / 12);
    }
  
    return result;
  }
  