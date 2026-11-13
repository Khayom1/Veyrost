export function solvePlanarTwoBone(dx, dy, upperLength=.5, lowerLength=.43) {
 const raw=Math.hypot(dx,dy), d=Math.max(Math.abs(upperLength-lowerLength)+1e-5,Math.min(upperLength+lowerLength-1e-5,raw));
 const target=Math.atan2(dx,-dy);
 const c1=Math.max(-1,Math.min(1,(upperLength*upperLength+d*d-lowerLength*lowerLength)/(2*upperLength*d)));
 const c2=Math.max(-1,Math.min(1,(d*d-upperLength*upperLength-lowerLength*lowerLength)/(2*upperLength*lowerLength)));
 return Object.freeze({shoulder:target-Math.acos(c1),elbow:Math.PI-Math.acos(c2),reachable:raw<=upperLength+lowerLength&&raw>=Math.abs(upperLength-lowerLength)});
}