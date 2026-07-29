document.addEventListener(
"DOMContentLoaded",
()=>{

console.log(
"Manufacturing Intelligence Suite iniciado"
);

const menuItems =
document.querySelectorAll(
".sidebar nav a"
);

menuItems.forEach(item=>{

item.addEventListener(
"click",
()=>{

menuItems.forEach(
i=>i.classList.remove("active")
);

item.classList.add("active");
}
);
});

function updateClock(){
let now =
new Date();

let date =
now.toLocaleDateString(
"es-MX",
{
day:"2-digit",
month:"2-digit",
year:"numeric"
}
);

let time =
now.toLocaleTimeString(
"es-MX"
);

let clock =
document.querySelector(
".system-clock"
);

if(clock){
clock.innerHTML=
`
${date}
<br>
${time}
`;

}
}

setInterval(
updateClock,
1000
);
updateClock();

const themeButton =
Array.from(
document.querySelectorAll(
".user-area span"
)
)
.find(
x=>x.textContent.includes(
"dark_mode"
)
);



if(themeButton){
themeButton.addEventListener(
"click",
()=>{

document.body.classList.toggle(
"dark"
);

if(
document.body.classList.contains(
"dark"
)
){

themeButton.textContent=
"light_mode";
}
else{
themeButton.textContent=
"dark_mode";
}
}
);
}

const numbers =
document.querySelectorAll(
".card h2"
);

numbers.forEach(
number=>{

let finalValue =
number.textContent;

let numeric =
parseInt(
finalValue.replace(
/[^0-9]/g,
""
)
);

if(isNaN(numeric))
return;

let counter=0;

let interval =
setInterval(
()=>{

counter +=
Math.ceil(
numeric/60
);

if(counter>=numeric){
counter=numeric;

clearInterval(
interval
);
}

let text =
finalValue.replace(
/[0-9,]+/,
counter.toLocaleString()
);

number.textContent=text;
},
20
);
}
);
});

function loadModule(page){
let dashboard =
document.getElementById(
"dashboardModule"
);

let container =
document.getElementById(
"moduleContainer"
);

dashboard.style.display=
"none";

container.style.display=
"block";

container.innerHTML=
`
<iframe
src="${page}">
</iframe>
`;
}

function showDashboard(){
let dashboard =
document.getElementById(
"dashboardModule"
);

let container =
document.getElementById(
"moduleContainer"
);

dashboard.style.display=
"block";

container.style.display=
"none";

container.innerHTML="";
}