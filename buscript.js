// =======================================
// SUPABASE CONFIG
// =======================================


const supabaseUrl =
"https://mrxtqmvufmlozplszfxc.supabase.co";

const supabaseKey =
"sb_publishable_jlCWFKk3xQnfvcjH1PfywQ_cJqILkk-";

const supabaseClient = supabase.createClient(
    supabaseUrl,
    supabaseKey
);


// =======================================
// LOAD ALL BU DATA FROM SUPABASE
// =======================================


async function getAllBUData(){


let allData = [];

let pageSize = 1000;

let start = 0;

let moreData = true;



while(moreData){



const {data,error}=await supabaseClient

.from("bu")

.select("*")

.range(
start,
start + pageSize - 1
);






allData = allData.concat(data);



console.log(
"Registros cargados:",
allData.length
);



if(data.length < pageSize){

moreData = false;

}
else{

start += pageSize;

}



}



console.log(
"TOTAL BU:",
allData.length
);



return allData;



}

// =======================================
// GLOBAL VARIABLES
// =======================================


let currentMonth;
let lastMonthCaptured;
let selectedWeek = null;
let balanceModelChart;
let balanceCellChart;
let uniformityModelChart;
let uniformityCellChart;
let percentDailyChart;
let buMonthChart;
let shiftChart;



// =======================================
// INIT
// =======================================


document.addEventListener(
"DOMContentLoaded",
()=>{

    loadDashboard();

});





// =======================================
// MAIN LOAD
// =======================================


async function loadDashboard(){
let allData = await getAllBUData();
lastMonthCaptured =
getLastMonthCaptured(allData);
currentMonth =
lastMonthCaptured;
console.log(
"Último mes capturado:",
currentMonth
);
await loadKPIs();
await loadWeeks();
await loadBUPerMonth();
await loadDailyPercentChart();
}





// =======================================
// LOAD KPI
// =======================================


async function loadKPIs(){



let allData = await getAllBUData();


let data = allData.filter(
x=>x.Month === currentMonth
);





console.log(
"Datos del mes actual:",
data.length
);


console.table(data);




// ================================
// BALANCE TOTAL
// MES ACTUAL + TYPE B
// ================================

// ================================
// BALANCE TOTAL
// MES ACTUAL + TYPE B
// ================================

// Obtener el mes actual del sistema
const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];

const currentSystemMonth = months[new Date().getMonth()];

let balance = allData
    .filter(row =>
        row.Month === currentSystemMonth &&
        row.Type === "B"
    )
    .reduce((sum, row) => sum + Number(row.Qty || 0), 0);

console.log("Balance Total:", balance);

// Mostrar el resultado en el card
document.getElementById("balanceTotal").innerText = balance.toLocaleString();






// ================================
// UNIFORMITY TOTAL
// MES ACTUAL + TYPE U
// ================================

let uniformity = allData
    .filter(row =>
        row.Month === currentSystemMonth &&
        row.Type === "U"
    )
    .reduce((sum, row) => sum + Number(row.Qty || 0), 0);

console.log("Uniformity Total:", uniformity);

// Mostrar el resultado en el card
document.getElementById("uniformityTotal").innerText = uniformity.toLocaleString();



// ================================
// DISTRIBUTION FROM BUPERCEN
// ================================

await loadDistributionPercent();






// ================================
// CURRENT WEEK
// ================================


let weeks = [

...new Set(

data.map(
x=>Number(x.Week)
)

)

];





weeks.sort(
(a,b)=>a-b
);





let currentWeek =

weeks.length

?

weeks[weeks.length-1]

:

"";






console.log(
"Semana actual:",
currentWeek
);







document.getElementById(
"currentPeriod"
)
.innerText =


currentMonth;





}





// =======================================
// WEEK BUTTONS
// =======================================


async function loadWeeks(){



let allData = await getAllBUData();


let data = allData.filter(
x=>x.Month === currentMonth
);



if(!data.length)
return;



let weeks=[...new Set(
data.map(x=>Number(x.Week))
)];



weeks.sort(
(a,b)=>a-b
);



const container =
document.getElementById(
"weekButtons"
);



container.innerHTML="";



weeks.forEach(
week=>{


let button =
document.createElement("button");


button.className =
"week-btn";


button.innerText =
"W"+Number(week);



button.onclick=()=>{


selectedWeek=week;


document.querySelectorAll(
".week-btn"
)
.forEach(
b=>b.classList.remove(
"active"
)
);


button.classList.add(
"active"
);



loadCharts();
loadWeekKPIs();
loadShiftChart();
};



container.appendChild(
button
);



});



if(weeks.length){


selectedWeek =
weeks[weeks.length-1];


document.querySelector(
".week-btn:last-child"
)
.classList.add(
"active"
);


await loadCharts();
await loadWeekKPIs();
await loadShiftChart();

}



}







// =======================================
// LOAD CHARTS
// =======================================


async function loadCharts(){


let allData = await getAllBUData();


let data = allData.filter(
x=>
x.Month === currentMonth &&
Number(x.Week) === Number(selectedWeek)
);



if(!data.length)
return;




createCharts(data);



}








// =======================================
// CREATE CHARTS
// =======================================


function createCharts(data){



let balance =
data.filter(
x=>x.Type==="B"
);



let uniformity =
data.filter(
x=>x.Type==="U"
);






// Balance Model


drawChart(

"balanceModelChart",

"bar",

groupData(
balance,
"Model"
),

"Balance by Model"

);






// Balance Cell


drawChart(

"balanceCellChart",

"bar",

groupData(
balance,
"Cell"
),

"Balance by Cell"

);







// Uniformity Model


drawChart(

"uniformityModelChart",

"bar",

groupData(
uniformity,
"Model"
),

"Uniformity by Model"

);








// Uniformity Cell


drawChart(

"uniformityCellChart",

"bar",

groupData(
uniformity,
"Cell"
),

"Uniformity by Cell"

);





}









// =======================================
// GROUP DATA
// =======================================


function groupData(data, field){

    let result = {};

    data.forEach(row => {

        if(!result[row[field]])
            result[row[field]] = 0;

        result[row[field]] += Number(row.Qty || 0);

    });


    // Ordenar de mayor a menor
    return Object.fromEntries(
        Object.entries(result)
        .sort((a,b)=> b[1] - a[1])
    );

}








// =======================================
// DRAW CHART
// =======================================


function drawChart(
canvas,
type,
values,
title
){

Chart.register(ChartDataLabels);

let chartMap={

"balanceModelChart":
balanceModelChart,

"balanceCellChart":
balanceCellChart,

"uniformityModelChart":
uniformityModelChart,

"uniformityCellChart":
uniformityCellChart

};




if(chartMap[canvas])

chartMap[canvas].destroy();




let chart =
new Chart(

document.getElementById(canvas),

{

type:type,


data:{


labels:Object.keys(values),


datasets:[{

label:title,

data:Object.values(values)

}]


},


options:{


responsive:true,


maintainAspectRatio:false,


plugins:{

    legend:{
        display:false
    },


    datalabels:{

        color:"#ffffff",

        anchor:"end",

        align:"top",

        font:{
            weight:"bold",
            size:12
        },


        formatter:function(value){

            return value.toLocaleString();

        }

    }

},


scales:{


x:{


ticks:{
color:"#d1d5db"
}


},


y:{


ticks:{
color:"#d1d5db"
}


}


}


}


}

);




if(canvas==="balanceModelChart")
balanceModelChart=chart;


if(canvas==="balanceCellChart")
balanceCellChart=chart;


if(canvas==="uniformityModelChart")
uniformityModelChart=chart;


if(canvas==="uniformityCellChart")
uniformityCellChart=chart;



}



// =======================================
// GET LAST MONTH CAPTURED
// =======================================

function getLastMonthCaptured(data){


const monthOrder = {

January:1,
February:2,
March:3,
April:4,
May:5,
June:6,
July:7,
August:8,
September:9,
October:10,
November:11,
December:12

};



let months = [

...new Set(

data.map(
x=>x.Month
)

)

];



months.sort(

(a,b)=>

monthOrder[b] - monthOrder[a]

);



return months[0];


}

// =======================================
// LOAD DISTRIBUTION FROM BUPERCEN
// =======================================

async function loadDistributionPercent(){

// Obtener el mes actual del sistema
const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];

const currentSystemMonth = months[new Date().getMonth()];

const {data,error}=await supabaseClient

.from("bupercen")

.select("*")

.eq(
"Month",
currentSystemMonth
);

console.log("Mes actual:", currentSystemMonth);
console.log("Cantidad de registros:", data.length);
console.table(data);

if(error){

console.error(
"Error cargando bupercen:",
error
);

return;

}



console.log(
"Datos bupercen:",
data
);




// Obtener Percent

// Obtener únicamente los valores numéricos
let percentValues = data
    .filter(row => row.Percent)
    .map(row => parseFloat(row.Percent))
    .filter(value => !isNaN(value));

// Calcular promedio
let averagePercent = 0;

if (percentValues.length > 0) {
    averagePercent =
        percentValues.reduce((sum, value) => sum + value, 0) /
        percentValues.length;
}

// Convertir a porcentaje
averagePercent = (averagePercent * 100).toFixed(2);

// Mostrar en el card
document.getElementById("distribution").innerText =
`${averagePercent}%`;

console.log("Distribution:", averagePercent + "%");



console.log(
"Average Percent:",
averagePercent
);



}







// =======================================
// LOAD WEEK SUMMARY CARDS
// =======================================

async function loadWeekKPIs(){


let allData = await getAllBUData();


// Filtrar datos de la semana seleccionada

let weekData = allData.filter(
x =>
Number(x.Week) === Number(selectedWeek)
);



// =======================================
// BALANCE WEEK
// Type B
// =======================================


let balance = weekData

.filter(
x=>x.Type==="B"
)

.reduce(
(sum,row)=>
sum + Number(row.Qty || 0),
0
);



document.getElementById(
"weekBalance"
)
.innerText =
balance.toLocaleString();





// =======================================
// UNIFORMITY WEEK
// Type U
// =======================================


let uniformity = weekData

.filter(
x=>x.Type==="U"
)

.reduce(
(sum,row)=>
sum + Number(row.Qty || 0),
0
);



document.getElementById(
"weekUniformity"
)
.innerText =
uniformity.toLocaleString();







// =======================================
// % WEEK FROM BUPERCEN
// =======================================


const {data,error}=await supabaseClient

.from("bupercen")

.select("*")

.eq(
"Week",
selectedWeek
);



if(error){

console.error(
"Error loading bupercen:",
error
);

return;

}





let percentValues = data

.map(
row=>Number(row.Percent)
)

.filter(
value=>!isNaN(value) && value > 0
);





let averagePercent = 0;



if(percentValues.length > 0){

    averagePercent =

    percentValues.reduce(
        (sum,value)=>
        sum + value,
        0
    )

    /

    percentValues.length;

}
else{

    averagePercent = 0;

}




// convertir 0.045 a 4.50%

averagePercent =
(
averagePercent * 100
)
.toFixed(2);





document.getElementById(
"weekPercentage"
)
.innerText =
averagePercent + "%";





console.log(
"Week:",
selectedWeek
);

console.log(
"Balance Week:",
balance
);

console.log(
"Uniformity Week:",
uniformity
);

console.log(
"% Week:",
averagePercent+"%"
);



}




// =======================================
// B&U PER MONTH
// =======================================

async function loadBUPerMonth(){


let allData = await getAllBUData();


const months = [
"January",
"February",
"March",
"April",
"May",
"June",
"July",
"August",
"September",
"October",
"November",
"December"
];



let balanceData = [];
let uniformityData = [];



months.forEach(month=>{


let balance = allData

.filter(row =>
row.Month === month &&
row.Type === "B"
)

.reduce(
(sum,row)=>
sum + Number(row.Qty || 0),
0
);



let uniformity = allData

.filter(row =>
row.Month === month &&
row.Type === "U"
)

.reduce(
(sum,row)=>
sum + Number(row.Qty || 0),
0
);



balanceData.push(balance);

uniformityData.push(uniformity);



});




createBUMonthChart(
months,
balanceData,
uniformityData
);



}


// =======================================
// CREATE B&U MONTH CHART
// =======================================


function createBUMonthChart(
labels,
balance,
uniformity
){


if(buMonthChart){

buMonthChart.destroy();

}



buMonthChart = new Chart(

document.getElementById(
"buMonthChart"
),

{


type:"line",


data:{


labels:labels,


datasets:[

{

label:"Balance",

data:balance,

borderColor:"#36a2eb",

backgroundColor:"#36a2eb",

pointBackgroundColor:"#36a2eb",

pointRadius:5,

pointHoverRadius:7,

tension:0.3


},


{

label:"Uniformity",

data:uniformity,

borderColor:"#ff6384",

backgroundColor:"#ff6384",

pointBackgroundColor:"#ff6384",

pointRadius:5,

pointHoverRadius:7,

tension:0.3

}


]


},



options:{


responsive:true,


maintainAspectRatio:false,


plugins:{


legend:{


display:true,


labels:{


color:"#d1d5db"


}


},



datalabels:{


color:"#ffffff",


anchor:"top",


align:"top",


font:{


weight:"bold",


size:12


},



formatter:function(value){


return value.toLocaleString();


}


}


},



scales:{


x:{


ticks:{


color:"#d1d5db"


}


},



y:{


ticks:{


color:"#d1d5db"


}


}


}



}



}


);



}


// =======================================
// LOAD SHIFT PIE CHART
// =======================================


async function loadShiftChart(){


let allData = await getAllBUData();



let shiftData = allData.filter(
row =>
row.Month === currentMonth &&
Number(row.Week) === Number(selectedWeek)
);



let shifts = {

A:0,
B:0,
C:0,
D:0

};



shiftData.forEach(row=>{


let shift = row.Shift;


if(shifts.hasOwnProperty(shift)){


shifts[shift] += Number(row.Qty || 0);


}



});



createShiftChart(shifts);



}



// =======================================
// CREATE SHIFT PIE
// =======================================


function createShiftChart(values){



if(shiftChart){

shiftChart.destroy();

}



shiftChart = new Chart(

document.getElementById(
"shiftChart"
),

{


type:"pie",



data:{


labels:Object.keys(values),



datasets:[{


data:Object.values(values),


backgroundColor:[

"#36A2EB",
"#FF6384",
"#FFCE56",
"#4BC0C0"

]


}]


},



options:{


responsive:true,


maintainAspectRatio:false,



plugins:{


legend:{


position:"right",


labels:{


color:"#d1d5db"


}


},



datalabels:{


color:"#ffffff",


font:{


weight:"bold",

size:14


},



formatter:function(value){


return value.toLocaleString();


}


}



}



}



}



);




}

// =======================================
// DAILY PERCENT CHART
// =======================================

async function loadDailyPercentChart(){


const today = new Date();


const year = today.getFullYear();

const month = today.getMonth();


// Primer día del mes

const firstDay = new Date(
year,
month,
1
);


// Día actual

const lastDay = new Date(
year,
month,
today.getDate()
);



// Formato YYYY-MM-DD

function formatDate(date){

let y = date.getFullYear();

let m = String(
date.getMonth()+1
).padStart(2,"0");


let d = String(
date.getDate()
).padStart(2,"0");


return `${y}-${m}-${d}`;

}




const startDate =
formatDate(firstDay);


const endDate =
formatDate(lastDay);





const {data,error}=await supabaseClient

.from("bupercen")

.select("Date,Percent")

.gte(
"Date",
startDate
)

.lte(
"Date",
endDate
)

.order(
"Date",
{
ascending:true
}
);




if(error){

console.error(
error
);

return;

}





let labels=[];

let values=[];




let current =
new Date(firstDay);




while(current <= lastDay){


let dateString =
formatDate(current);



labels.push(
dateString.substring(8,10)
);




let row = data.find(
x=>x.Date === dateString
);



if(row){

values.push(
Number(row.Percent)*100
);

}
else{

values.push(null);

}



current.setDate(
current.getDate()+1
);


}




if(percentDailyChart){

percentDailyChart.destroy();

}




Chart.register(
ChartDataLabels
);




percentDailyChart = new Chart(

document.getElementById(
"percentDailyChart"
),

{


type:"line",



data:{


labels:labels,


datasets:[{


label:"Percent %",


data:values,


borderColor:"#22c55e",


backgroundColor:
"rgba(34,197,94,0.20)",


fill:true,


tension:0.3,


pointRadius:5,


pointBackgroundColor:"#22c55e"


}]


},



options:{


responsive:true,


maintainAspectRatio:false,



plugins:{


legend:{


display:true


},



datalabels:{
    color:"#ffffff",

    anchor:"end",
    
    align:"top",

    offset:8,

    font:{
        weight:"bold",
        size:12
    },

    formatter:function(value){

        if(value===null)
            return "";

        return value.toFixed(2)+"%";
    }
}


},

scales:{
x:{
ticks:{
color:"#d1d5db"


}


},



y:{


ticks:{


color:"#d1d5db",


callback:function(value){

return value+"%";

}


}


}



}



}



}



);



}


