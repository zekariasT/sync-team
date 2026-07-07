// AA contrast check for the Team Pulse token system (real values from globals.css)
const hex = (h) => { h=h.replace('#',''); return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)); };
const comp = (fg, a, bg) => fg.map((c,i)=>Math.round(c*a + bg[i]*(1-a))); // composite rgba over solid
const lin = (c)=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
const L = (rgb)=>0.2126*lin(rgb[0])+0.7152*lin(rgb[1])+0.0722*lin(rgb[2]);
const ratio = (a,b)=>{const l1=L(a),l2=L(b);return ((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05));};
const sage=[92,131,116], clayC=[176,113,88], amber=[176,134,52];

const cases = [];
const add=(label,fg,bg,min=4.5)=>cases.push({label,r:ratio(fg,bg),min});

// LIGHT
const Lbg=hex('#F5F1EA'),Lsurf=hex('#FCFAF6'),Lsurf2=hex('#EFE9DE'),Lside=hex('#EFE8DD');
add('L text/bg', hex('#2B2722'), Lbg);
add('L text/surface', hex('#2B2722'), Lsurf);
add('L text-muted/surface', hex('#5F5950'), Lsurf);
add('L text-muted/surface-2', hex('#5F5950'), Lsurf2);
add('L text-faint/bg', hex('#6A6358'), Lbg, 3.0);
add('L brand-text on brand-soft/surface', hex('#3C5A4C'), comp(sage,0.13,Lsurf));
add('L admin badge txt(brand) on soft/surface', hex('#3C5A4C'), comp(sage,0.13,Lsurf));
add('L lead-text on lead-bg/surface', hex('#7A5A1E'), comp(amber,0.14,Lsurf));
add('L member badge muted on surface-2', hex('#5F5950'), Lsurf2);
add('L active-nav brand-text on soft/sidebar', hex('#3C5A4C'), comp(sage,0.13,Lside));
add('L primary-fg on primary(btn)', hex('#FBF8F2'), hex('#4C6F60'));
add('L root badge fg on primary', hex('#FBF8F2'), hex('#4C6F60'));
add('L destructive-fg on destructive', hex('#FBF8F2'), hex('#B23A2C'));
add('L avatar sage fg/bg', hex('#33503F'), comp(sage,0.16,Lsurf));
add('L avatar clay fg/bg', hex('#7E4A34'), comp(clayC,0.16,Lsurf));
add('L avatar amber fg/bg', hex('#6B4F18'), comp(amber,0.16,Lsurf));

// DARK
const Dbg=hex('#1C1A18'),Dsurf=hex('#24211E'),Dsurf2=hex('#2B2824'),Dside=hex('#1F1D1A');
const sageD=[123,168,147],clayD=[201,138,110],amberD=[214,178,110];
add('D text/bg', hex('#ECE7DE'), Dbg);
add('D text/surface', hex('#ECE7DE'), Dsurf);
add('D text-muted/surface', hex('#A39B8F'), Dsurf);
add('D text-faint/bg', hex('#948B7E'), Dbg, 3.0);
add('D brand-text on brand-soft/surface', hex('#A9CDBC'), comp(sageD,0.16,Dsurf));
add('D lead-text on lead-bg/surface', hex('#D8B673'), comp(amberD,0.15,Dsurf));
add('D primary-fg on primary(btn)', hex('#16201B'), hex('#6E9A88'));
add('D destructive-fg on destructive', hex('#1C140F'), hex('#E08267'));
add('D avatar sage fg/bg', hex('#A9CDBC'), comp(sageD,0.18,Dsurf));
add('D avatar amber fg/bg', hex('#D8B673'), comp(amberD,0.18,Dsurf));

// CLAY light/dark
add('L(clay) brand-text on soft/surface', hex('#7E4A34'), comp(clayC,0.14,Lsurf));
add('L(clay) primary-fg on primary', hex('#FBF6F2'), hex('#9A5E45'));
add('D(clay) brand-text on soft/surface', hex('#D9A589'), comp(clayD,0.16,Dsurf));
add('D(clay) primary-fg on primary', hex('#1C140F'), hex('#C0795C'));

let fails=0;
for(const c of cases){const ok=c.r>=c.min;if(!ok)fails++;
  console.log(`${ok?'PASS':'FAIL'}  ${c.r.toFixed(2)}:1  (min ${c.min})  ${c.label}`);}
console.log(`\n${fails===0?'ALL PASS':fails+' FAILURE(S)'} — ${cases.length} pairs checked`);
process.exit(fails?1:0);
