/*
Copyright (C): 2010-2020, Daniel
*/
//% color="#ECA40D" weight=20 icon="\uf085"
namespace PCA9685 {

    const PCA9685_ADDRESS = 0x40
    const MODE1 = 0x00
    const MODE2 = 0x01
    const SUBADR1 = 0x02
    const SUBADR2 = 0x03
    const SUBADR3 = 0x04
    const PRESCALE = 0xFE
    const LED0_ON_L = 0x06
    const LED0_ON_H = 0x07
    const LED0_OFF_L = 0x08
    const LED0_OFF_H = 0x09
    const ALL_LED_ON_L = 0xFA
    const ALL_LED_ON_H = 0xFB
    const ALL_LED_OFF_L = 0xFC
    const ALL_LED_OFF_H = 0xFD

    const STP_CHA_L = 2047
    const STP_CHA_H = 4095

    const STP_CHB_L = 1
    const STP_CHB_H = 2047

    const STP_CHC_L = 1023
    const STP_CHC_H = 3071

    const STP_CHD_L = 3071
    const STP_CHD_H = 1023

    let initialized = false

    function i2cwrite(addr: number, reg: number, value: number) {
        let buf = pins.createBuffer(2)
        buf[0] = reg
        buf[1] = value
        pins.i2cWriteBuffer(addr, buf)
    }

    function i2cread(addr: number, reg: number) {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
        let val = pins.i2cReadNumber(addr, NumberFormat.UInt8BE);
        return val;
    }

    function initPCA9685(): void {
        i2cwrite(PCA9685_ADDRESS, MODE1, 0x00)
        setFreq(50);
        setPwm(0, 0, 4095);
        for (let idx = 1; idx < 16; idx++) {
            setPwm(idx, 0, 0);
        }
        initialized = true
    }

    function setFreq(freq: number): void {
        // Constrain the frequency
        let prescaleval = 25000000;
        prescaleval /= 4096;
        prescaleval /= freq;
        prescaleval -= 1;
        let prescale = prescaleval; //Math.Floor(prescaleval + 0.5);
        let oldmode = i2cread(PCA9685_ADDRESS, MODE1);
        let newmode = (oldmode & 0x7F) | 0x10; // sleep
        i2cwrite(PCA9685_ADDRESS, MODE1, newmode); // go to sleep
        i2cwrite(PCA9685_ADDRESS, PRESCALE, prescale); // set the prescaler
        i2cwrite(PCA9685_ADDRESS, MODE1, oldmode);
        control.waitMicros(5000);
        i2cwrite(PCA9685_ADDRESS, MODE1, oldmode | 0xa1);
    }

    function setPwm(channel: number, on: number, off: number): void {
        if (channel < 0 || channel > 15)
            return;

        let buf = pins.createBuffer(5);
        buf[0] = LED0_ON_L + 4 * channel;
        buf[1] = on & 0xff;
        buf[2] = (on >> 8) & 0xff;
        buf[3] = off & 0xff;
        buf[4] = (off >> 8) & 0xff;
        pins.i2cWriteBuffer(PCA9685_ADDRESS, buf);
    }

    export enum enServo {

        S1 = 0,
        S2,
        S3,
        S4,
        S5,
        S6,
        S7,
        S8
    }
    export enum enMotors {
        M1 = 8,
        M2 = 10,
        M3 = 12,
        M4 = 14
    }

    //% blockId=SuperBit_Servo block="Servo(180°)|num %num|value %value"
    //% weight=97
    //% blockGap=10
    //% num.min=1 num.max=4 value.min=0 value.max=180
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=20
    export function Servo(num: enServo, value: number): void {

        // 50hz: 20,000 us
        let us = (value * 1800 / 180 + 600); // 0.6 ~ 2.4
        let pwm = us * 4096 / 20000;
        setPwm(num, 0, pwm);

    }

    //% blockId=SuperBit_Servo2 block="Servo(270°)|num %num|value %value"
    //% weight=96
    //% blockGap=10
    //% num.min=1 num.max=4 value.min=0 value.max=270
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=20
    export function Servo2(num: enServo, value: number): void {

        // 50hz: 20,000 us
        let newvalue = Math.map(value, 0, 270, 0, 180);
        let us = (newvalue * 1800 / 180 + 600); // 0.6 ~ 2.4
        let pwm = us * 4096 / 20000;
        setPwm(num, 0, pwm);

    }

    //% blockId=SuperBit_MotorRun block="Motor|%index|speed(-255~255) %speed"
    //% weight=93
    //% speed.min=-255 speed.max=255
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function MotorRun(index: enMotors, speed: number): void {
        if (!initialized) {
            initPCA9685()
        }
        speed = speed * 16; // map 255 to 4096
        if (speed >= 4096) {
            speed = 4095
        }
        if (speed <= -4096) {
            speed = -4095
        }

        let a = index
        let b = index + 1

        if (a > 10) {
            if (speed >= 0) {
                setPwm(a, 0, speed)
                setPwm(b, 0, 0)
            } else {
                setPwm(a, 0, 0)
                setPwm(b, 0, -speed)
            }
        }
        else {
            if (speed >= 0) {
                setPwm(b, 0, speed)
                setPwm(a, 0, 0)
            } else {
                setPwm(b, 0, 0)
                setPwm(a, 0, -speed)
            }
        }

    }


    function stopMotor(index: number) {
        setPwm(index, 0, 0);
        setPwm(index + 1, 0, 0);
    }

    //% blockId=SuperBit_MotorStopAll block="Motor Stop All"
    //% weight=91
    //% blockGap=50
    export function MotorStopAll(): void {
        if (!initialized) {
            initPCA9685()
        }

        stopMotor(enMotors.M1);
        stopMotor(enMotors.M2);
        stopMotor(enMotors.M3);
        stopMotor(enMotors.M4);

    }


    /***************************************************************** */
    /*红外接收部分***************************************************** */
    /***************************************************************88 */
}