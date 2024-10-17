This node splits the price data into several groups. Starting with the cheapest group, ending with the most expensive group.
You can define a individual output value for each group.
Depending on the price for electric power for a given time, the system assigns an output group to each hour within the defined time range.

The output value for the group will be sent to the output.
    
    
### Inputs
    
1. payload (priceData) :  Price data for electric power supplier (E.g. Tibber).
2. Time : Time to be considered for calculating the output
    
### Outputs
    
1. Node : payload (string) : The output value for the current time
      time: The time either from input or current time
    
2. Node : The schedule (for Merge Schedule): payload (string) : the standard error of the command.
    
### Details
A typical use case for this node is optimzation of power consumption for hot water generation in a tank by a heat pump.

The output of each range will set the minimum tank temperature for the given price range in the heat pump.
If the electric power is cheap, the temperature is lower and the heat pump will start hot water generation also if the tank temperature is higher.
If it's very high, the temperature is the higher.
You can press the **"More"** - Button to add more price ranges. They are in between lowest price range and highest price range.

###Example:
|Configuration| Value|
|-------------|---|
|Group Cheapest Ouput Value (min temperature)|42|
|Group Most Expensive Ouput Value (min temperature)|45|

|Time Range|Price|Output Group|Output Value|
|-------------|----|-----------------------------|----|    
|00:00 - 01:00|0.25| Price >0.24 => Most Expensive |45|
|01:00 - 02:00|0.24| Price <=0.24 => Cheapest|42|
|02:00 - 03:00|0.27| Price >0.24 => Most Expensive|45|
|03:00 - 04:00|0.22| Price <=0.24 => Cheapest|42|
|04:00 - 05:00|0.23| Price <=0.24 => Cheapest|42|
|05:00 - 06:00|0.28| Price >0.24 => Most Expensive|45|

If the temperature in the tank is 43, the heatpump will start only in the Cheapest Range.<br/>
If the temperature is below 42, the heatpump will also start in the Most Expensive Range.

### Price Date Limit
The Price Date Limit sets the number of hours to be considered for price comparising.
The most meaningful value in the hot water heatpump example is the number of hours, until the tank needs to be reloaded.
A typical values are in the range of 12h-24h.

Example:

If your tank looses 4°C per day and your hysteresis is 4°C, then your tank needs 24h until it needs to be reloaded.

The Price Date Limit is interesting with multiple schedules per day. E.g one schedule for day time, one for night time.
In this case, the Price Date Limit can be 24h and the schedule can be shorter. 

Example:

The Price Date Limit is 24h
The prices from now to next day same time vary from 0.20 to 0.40.
And there are three ranges
The price ranges for the next 24h hours could look like this: R1: 0.20 to 0.30, R2 0.30 to 0.35, R3 0.35 to 0.40 
Your schedule is 00:00-06:00 during this time range, the prices vary from 0.30 to 0.38.
In this case the output value will only contain values of R2 and R3. There will be no output of R1, 
because in this schedule, there are no price in the range R1.


### Schedule

**Active during** Only scheduled times within this range will have an output value. This is useful to split a schedule for a day into two pieces (night and day)


### Options for Price Ranges
The Cheapest Range has the following options:
|Option|Description|
|-|-|
|**Output Value**| The output value is the value which will be sent to the nodes connected to the first output. In the example, this is the minimum temperature.|
|**"1 h max"** and **"2 h max** "**| The cheapest range will contain only 1 entry. If your heat pump can raise the temperature from minimum temperature to maximum temperature in no more than 1 (or2) hour(s), this is a useful feature.|
|**consecutive**|tbd. |
|**Price Tolerance Cheapest**|This is meaningful if the **1/2 h max** feature is enabled and the **Price Date Limit** is larger than the scheduled range. <br/>If the price(PH) for a given hour is within the range minimum  price (MP) to minimum price plus tolerance(TP), the output value will be the output value of the cheapest range|

You can set an additional Price Range node to set the lowest tank temperature or the hysteresis (Delta of maximum tank temperature mins minimum tank temperature)
The default algorithm will split the price/time table into ranges having the same number of entries.
Example:
```
In a schedule 00:00-12:00 with two ranges, the ranges will have 6 entries each.
```
### No Prices Available
This is the output value, if there are no prices available (E.g. because of network down issues). This makes sure to have a running hot water system even if no price data is available.

### How to set the minimum temperature
For many heat pumps the minimum temperature is not configurable. In this case, there are two options:
1. If the hysteresis is configurable, the minimum temperature is set point temperature minus hysteresis.
2. If the hysteresis is fixed, the set point temperature can be used.
### Set the maximum temperature?
If you want to set minimum and maximum temperature, you can configure two price range nodes with the same schedule and price ranges but with different output values.
The minimal price is in the cheapest range. So, it makes sense to have a maximal the maximum temperature and a maximal min temperature for the cheapest range. 
So, the heat pump "must" use this time segment for preparing hot water.

