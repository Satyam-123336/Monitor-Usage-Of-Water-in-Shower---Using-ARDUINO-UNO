#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);  // Try 0x3F if 0x27 doesn't work

const int flowSensorPin = 2;
const int buzzerPin = 3;

volatile int pulseCount;
float flowRate;
float totalLitres = 0;
unsigned long previousMillis;
bool motorIdle = false;
bool buzzerAlerted = false;

void setup() {
  pinMode(flowSensorPin, INPUT_PULLUP);
  pinMode(buzzerPin, OUTPUT);
  digitalWrite(buzzerPin, LOW);

  Serial.begin(115200);

  lcd.init();
  lcd.backlight();

  // Show project heading
  lcd.setCursor(0, 0);
  lcd.print("MONITOR USAGE OF");
  lcd.setCursor(0, 1);
  lcd.print("WATER IN SHOWER");
  delay(3000);
  lcd.clear();

  attachInterrupt(digitalPinToInterrupt(flowSensorPin), pulseCounter, FALLING);
  previousMillis = millis();
}

void loop() {
  unsigned long currentMillis = millis();
  
  if ((currentMillis - previousMillis) >= 1000) {
    detachInterrupt(digitalPinToInterrupt(flowSensorPin));

    flowRate = ((1000.0 / (currentMillis - previousMillis)) * pulseCount) / 7.5;
    float litresPerMinute = flowRate;
    float litresUsedThisSecond = litresPerMinute / 60.0;
    totalLitres += litresUsedThisSecond;

    bool limitExceeded = totalLitres >= 0.5;

    lcd.clear();
    
    if (flowRate > 0.0) {
      motorIdle = false;
      lcd.setCursor(0, 0);
      lcd.print("Flow: ");
      lcd.print(flowRate, 1);
      lcd.print(" L/min");

      lcd.setCursor(0, 1);
      lcd.print("Used: ");
      lcd.print(totalLitres, 2);
      lcd.print(" L");
    } else {
      if (!motorIdle) {
        lcd.setCursor(0, 0);
        lcd.print("Motor Idle");
        lcd.setCursor(0, 1);
        lcd.print("Used: ");
        lcd.print(totalLitres, 2);
        lcd.print(" L");
        motorIdle = true;
      }
    }

    Serial.print("{\"flowLpm\":");
    Serial.print(flowRate, 2);
    Serial.print(",\"totalLitres\":");
    Serial.print(totalLitres, 2);
    Serial.print(",\"motorIdle\":");
    Serial.print(motorIdle ? "true" : "false");
    Serial.print(",\"limitExceeded\":");
    Serial.print(limitExceeded ? "true" : "false");
    Serial.print(",\"buzzerAlerted\":");
    Serial.print(buzzerAlerted ? "true" : "false");
    Serial.println("}");

    // Alert only once when usage crosses 0.5L
    if (limitExceeded && !buzzerAlerted) {
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Limit Exceeded!!");

      digitalWrite(buzzerPin, HIGH);
      delay(10000); // Buzzer rings for 10 seconds
      digitalWrite(buzzerPin, LOW);
      
      buzzerAlerted = true;
    }

    pulseCount = 0;
    previousMillis = currentMillis;
    attachInterrupt(digitalPinToInterrupt(flowSensorPin), pulseCounter, FALLING);
  }
}

void pulseCounter() {
  pulseCount++;
}
