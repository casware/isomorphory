# isomorphory

A Javascript framework for testing that two data stores are *isormorphic*.

## Use Case
Use isomorphory if 
- you care about data quality, but don't have a good tool for measuring it throughout your data pipelines
- you need to quickly spin up a tool for comparing data stores in Javascript.
- You are creating/maintaing a data pipeline and need to ensure that the data is arriving correcty at the end of the pipeline
- Off-the shelf data profiling solutions don't fit your use case, or you don't have the time and resources to learn how to do them

## Features
isomorphory handles the plumbing so that you can focus on the data.
isomorphory is strucutured around running iso-tasks.
An iso-task is a comparison of a single *chunk* of data, where you get to define how large or small a chunk is.
There is the following tree: iso-tasks -> iso-chains -> iso
1. Partial progress - if an error occurs during a ----- run, all progress up to that point is persisted; isomorphory handles restarting the job *from the point of failure* out of the box
2. Parallelization - run iso-tasks up to some parallel limit, maximally efficiently
3. Stream results - hold results in memory only as long they are needed but no longer
4. Error handling - global retry options that can be overrided for each specific function
5. Data store agnostic - you write the data connection layer, so isomorphory does not care if you are pulling data from PostgreSQL, DynamoDB, or flat files
