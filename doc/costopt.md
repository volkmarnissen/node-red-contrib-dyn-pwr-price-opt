# Cost Optimization

## Basic Concept

The costs for heating depends on when and at which price the heating needs to be enabled.
Perfect cost optimization is complex and time consuming. That's why this approach has the following simplifying assumptions:
1. Increasing temperature when heating is linear function of time
2. Decreasing temperature is also a linear function of time. It is caused by cooling down (outer temperature lower than inner temperature)
3. It's not neccessary to work with exact prices. It's sufficient to work with price ranges.
  The first price range contains as many periods as heating periods are expected.
  The other price ranges have the same size as the first one.
4. It's not required to control the current temperature. This is still done by the heatpump.
  It's only required to set the set point of the temperature.
5. The low temperature depends on the period. At night time the temperature might be lower.
  This is not considered in the optimization, because the calculation of the current temperature is required for this optimization.

### The Process
The cost optimization will set a high target temperature for low prices. It will set a low target temperature for high prices.

The cost evaluation happens for a given period of time.
The number of periods can be calculated as
```
number of periods = evaluation period of time/ period length
```
During these periods, the heating must generate a positive temperature equal to the decreasion of the temperature by cooling down in the same period.
The number of heating periods can be calculated as:
```
  number of heating period = total periods * decreasion rate/ increasion rate
```
Each period has a price range assigned.
The lowest price periods get the first range, the highest prices get the last range.

So, the input for the Cost Optimization is:
1. Start Period
2. End Period
3. Temperature Decreasion rate
4. Temperature Increasio rate
5. Cost table for the period

## Periods
There are two time periods to be considered
1. **short term period**: Longest time with no heating required
2. **long term period**: Maximum period length

### Short Term Period

The number of periods of the short term period can be calculated as:
```
 number of periods = Floor((current temperature - minimum temperature - hysteresis)/ Temperature Decreasion Rate)
```
The Start Period is the period of the current time
### Long Term Period
The number of periods is the maximum of the number of periods in the given price table and ```number of periods = short term periods * factor```
Factor can be configured. The default is 4. If there are less prices available, the number of prices is the numbe rof periods

### To Heat or Not to Heat
The **long term periods** and the **short term periods** cost optimation result will most likely have different price ranges. But they share the same start period.

So, if the **first** price in the **long term period** of the same time period is in the low price range, the set point will be the **high temperature**.

Otherwise if **any** price in the **long term period** of the same time period is in the low price range the set point will be the **low temperature**.

Otherwise if the **first** price of the **short term period** is in the low price range, the set point will be the **high temperature**.
Otherwise the set point will be **low temperature**