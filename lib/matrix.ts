export type Matrix=number[][];
export const IDENTITY:Matrix=[[1,0,0],[0,1,0],[0,0,1]];
export function scalar(source:string):number{
 const text=source.trim().toLowerCase();
 if(!text||text.length>100)throw new Error('Enter a number in every cell.');
 const tokens=text.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|sqrt|pi|[()+*/^−-]/g)??[];
 if(tokens.join('')!==text.replace(/\s/g,''))throw new Error('Use numbers, fractions, pi or sqrt().');
 let i=0;
 const primary=():number=>{const t=tokens[i++];if(t==='('){const v=sum();if(tokens[i++]!==')')throw new Error('Close the parentheses.');return v;}if(t==='sqrt'){if(tokens[i++]!=='(')throw new Error('Use sqrt(number).');const v=sum();if(tokens[i++]!==')')throw new Error('Close the parentheses.');return Math.sqrt(v);}if(t==='pi')return Math.PI;if(!t||!/^\d|^\./.test(t))throw new Error('Finish the expression.');return Number(t);};
 const power=():number=>{const v=primary();if(tokens[i]==='^'){i++;return v**unary();}return v;};
 const unary=():number=>{if(tokens[i]==='-'||tokens[i]==='−'){i++;return -unary();}if(tokens[i]==='+'){i++;return unary();}return power();};
 const product=():number=>{let v=unary();while(tokens[i]==='*'||tokens[i]==='/'){const op=tokens[i++],n=unary();v=op==='*'?v*n:v/n;}return v;};
 const sum=():number=>{let v=product();while(['+','-','−'].includes(tokens[i])){const op=tokens[i++],n=product();v=op==='+'?v+n:v-n;}return v;};
 const value=sum();if(i!==tokens.length||!Number.isFinite(value))throw new Error('Enter a finite real number.');if(Math.abs(value)>10000)throw new Error('Keep values between −10,000 and 10,000.');return value;
}
export function parseMatrix(source:string):Matrix{
 if(source.length>3000)throw new Error('Matrix input is too long.');
 let text=source.trim().replace(/^[a-zA-Z]\s*=\s*/,'');text=text.replace(/\]\s*,?\s*\[/g,';').replace(/[\[\]]/g,'');
 const matrix=text.trim().split(/[;\n]+/).filter(r=>r.trim()).map(row=>row.trim().split(/[\s,]+/).map(scalar));
 if(matrix.length!==3||matrix.some(r=>r.length!==3))throw new Error('Enter exactly 3 rows and 3 columns.');return matrix;
}
export const formatMatrix=(m:Matrix)=>'['+m.map(r=>r.join(' ')).join(';\n ')+']';
export const determinant=(m:Matrix)=>m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])-m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])+m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
export function rank(m:Matrix):number{const a=m.map(r=>[...r]);const tolerance=Math.max(...a.flat().map(Math.abs))*1e-10;let rank=0;for(let col=0;col<3;col++){let pivot=rank;for(let row=rank+1;row<3;row++)if(Math.abs(a[row][col])>Math.abs(a[pivot][col]))pivot=row;if(Math.abs(a[pivot][col])<=tolerance)continue;[a[rank],a[pivot]]=[a[pivot],a[rank]];for(let row=rank+1;row<3;row++){const f=a[row][col]/a[rank][col];for(let c=col;c<3;c++)a[row][c]-=f*a[rank][c];}rank++;}return rank;}
