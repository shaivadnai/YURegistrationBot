/**
 * Copyright (c) 2020
 *
 * Registration Bot for students in Yeshiva University's MY Program
 * 
 * Uses Puppeteer, Readline and OS to determine
 * correct Chrome Path and run registration script.
 * 
 * Google Chrome is a dependency (can be packaged for standalone use)
 * 
 * This has been tested to remain functional if run
 * one hour prior to use time and will execute registration
 * in ~4 seconds (GUI) or ~2 seconds (Headless)
 * 
 * Customizable by user, but requires admin input the correct
 * registration time
 * 
 * This bot can be customized to perform on any banner system
 * and is being ported for use in STERN, IBC, BMP and JSS
 * 
 * @summary AutoRegistration Bot for Yeshiva University
 * @author Charles Vadnai <cvadnai@mail.yu.edu>
 *
 * Created at     : 2020-12-13 
 * Last modified  : 2020-12-22
 */

//dependencies
const { SSL_OP_EPHEMERAL_RSA } = require('constants');
const puppeteer = require('puppeteer');
const readline = require('readline');
const os = require('os');
const { exit } = require('process');

//constants and variables

//set by developer for specific user
const date = "12/20/2020 13:56:00";

//convert registration date to machine readable
const epoch = setDate(date);

//Url of server
const Url = 'https://selfserveprod.yu.edu/pls/banprd/twbkwbis.P_WWWLogin'

//Set by client when script is run
var UserID = "";
var UserPIN = "";
var ShiurCRN = "";
var crn1 = "";
var crn2 = "";
var crn3 = "";
var crn4 = "";
var crn5 = "";
var crn6 = "";

//location of local chrome executable
var chromiumExecutablePath = null;

//wait functions
const pause = () => new Promise(res => setTimeout(res, 1000));
const pause2 = () => new Promise(res => setTimeout(res, 250));

//set chrome path by os
switch (os.type()) {
    case "Windows_NT":
        chromiumExecutablePath = "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"
        break;
    case "Darwin"://Mac
        chromiumExecutablePath = "/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome"
        break;
    case "Linux":
        chromiumExecutablePath = "/bin/chromium-browser"
    default:
        chromiumExecutablePath = "operating system could not be detected";
        console.log(chromiumExecutablePath);
        exit(1);
}

//helper functions

//human date to epoch
function setDate(date) {
    var myDate = new Date(date);
    var myEpoch = myDate.getTime();
    return myEpoch;
}

//find text
const escapeXpathString = str => {
    const splitedQuotes = str.replace(/'/g, `', "'", '`);
    return `concat('${splitedQuotes}', '')`;
};

//click on object by text
const clickByText = async (page, text) => {
    const escapedText = escapeXpathString(text);
    const linkHandlers = await page.$x(`//a[contains(text(), ${escapedText})]`);

    if (linkHandlers.length > 0) {
        await linkHandlers[0].click();
    } else {
        throw new Error(`Link not found: ${text}`);
    }
};

//get user input
async function getData(prompt) {
    var val = ""
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    await rl.question(prompt, (name) => {
        if ("" == name) {
            name = " ";
        }
        val = name;
        rl.close();
    });
    while (val == "") {
        await pause2();
    }
    return val;
}

//start of main program

(async () => {

    //get user credentials and CRNs
    UserID = await getData("What is you YUID Number? ");
    UserPIN = await getData("What is your BANNER Pin (not YUAD)? ");

    console.log("Once you've entered all you CRNS, hit enter to leave the remaining CRNs empty.")

    ShiurCRN = await getData("What is your Shiur CRN? ");

    crn1 = await getData("Enter CRN1: ");
    crn2 = await getData("Enter CRN2: ");
    crn3 = await getData("Enter CRN3: ");
    crn4 = await getData("Enter CRN4: ");
    crn5 = await getData("Enter CRN5: ");
    crn6 = await getData("Enter CRN6: ");

    //display preset registration time to user
    var myDate = new Date(epoch);
    console.log("Opening chrome 30 seconds before:" + myDate.toLocaleString());

    //Wait until 30 seconds before Registration Time, update current system time.
    //Prevents banner time-based logout
    var now = Date.now();
    while (now < (epoch - 30000)) {
        //showTime(now);
        process.stdout.write(`clock: ${new Date()}\r`);
        await pause();
        now = Date.now();
    }

    //open browser and new page
    const browser = await puppeteer.launch({
        headless: false,//false
        executablePath: chromiumExecutablePath
    })
    const page = await browser.newPage();

    //navigate to myyu login page
    await page.goto(Url);

    //wait for login page to load
    await page.waitForFunction(
        'document.querySelector("body").innerText.includes("Forgot PIN?")',
    );

    /*await eval() is used to avoid issues with PKG for executable creation */

    //enter login info and click login
    await eval('page.evaluate((text) => { (document.getElementById("UserID")).value = text; }, UserID);');
    await eval('page.evaluate((text) => { (document.getElementById("PIN")).value = text; }, UserPIN);');
    const clickForLogin = await page.$x('//*[@type="submit"]');
    await clickForLogin[0].click();

    console.log("Logged in");

    //wait for login process to complete
    await page.waitForSelector('body > div.pagebodydiv');

    //click through all menus (faster than [await page.goto(Url.concat("bwskfreg.P_AltPin"));])
    await clickByText(page, "Student and Finan");
    await page.waitForNavigation();
    await clickByText(page, "Registration");
    await page.waitForNavigation();
    await clickByText(page, "Add or Drop Classes");

    
    await page.waitForNavigation();

    //display preset registration time to user
    myDate = new Date(epoch);
    console.log("Awaiting Registration Time:" + myDate.toLocaleString());

    //Wait until Registration Time, update line displaying current time
    now = Date.now();
    while (now < epoch) {
        //showTime(now);
        process.stdout.write(`clock: ${new Date()}\r`);
        await pause();
        now = Date.now();
    }

    //term select (default is the correct term, so just click submit)
    const clickForSubmit = await page.$x('//*[@value="Submit"]');
    await clickForSubmit[0].click();
    console.log("Term Selection Done");


    //Shiur Credit Selection - Sets to 0 (can be edited by user afterwards)
    await page.waitForNavigation();
    const clickForZeroCredits = await page.$x('//*[@value="SUBMIT"]');
    await clickForZeroCredits[0].click();
    console.log("Shiur Credit Selection Done");

    //Submit Shiur CRN
    await page.waitForFunction('document.querySelector("body").innerText.includes("MYP JEWISH STUDIES REGISTRATION ONLY")')
    await eval('page.evaluate((text) => { (document.getElementById("crn_id1")).value = text; }, ShiurCRN);');
    const clickToSubmitShiurCRN = await page.$x('//*[@value="Submit Changes"]');
    await clickToSubmitShiurCRN[0].click();
    console.log("Shiur Registration Done");

    //Submit all Secular CRNs
    await page.waitForFunction(
        'document.querySelector("body").innerText.includes("YOU HAVE SATISFIED THE MYP REGISTRATION REQUIREMENT")',
    );
    await eval('page.evaluate((text) => { (document.getElementById("crn_id1")).value = text; }, crn1);');
    await eval('page.evaluate((text) => { (document.getElementById("crn_id2")).value = text; }, crn2);');
    await eval('page.evaluate((text) => { (document.getElementById("crn_id3")).value = text; }, crn3);');
    await eval('page.evaluate((text) => { (document.getElementById("crn_id4")).value = text; }, crn4);');
    await eval('page.evaluate((text) => { (document.getElementById("crn_id5")).value = text; }, crn5);');
    await eval('page.evaluate((text) => { (document.getElementById("crn_id6")).value = text; }, crn6);');
    const clickToSubmitclassCRN = await page.$x('//*[@value="Submit Changes"]');
    await clickToSubmitclassCRN[0].click();

    console.log("Secular Registration Done");

})();
