# DataMo

DataMo is a library used to monitor data in real time. It has been originally developped to monitor training data of neural networks in cpp. The language implementation of the writer aim to be thread safe.

An implementation of the writer exist currently for the following languages
 - C++ in the `cpp` folder

An web interface to read the data in realtime is developped in python

## Data definition (v0.1)

The data of the monitoring are stored in binary file using the `.datamo` extension.
They are stored following the following scheme
 - A magic string `"DATAMO"`
 - The date and time (DD/MM/YYYY~HH:mm:ss::mmm) encoded on 24 bytes
 - A data type identifier (see the _DataType_ section) encoded on 2 bytes
 - A name identifier on 24 bytes
 - The size of the stored data in bytes encoded on 8 bytes
 - The data (encoded on `size` bytes)


|`DATAMO`| date     |ID      | name     | size    |data |
|:------:|:--------:|:------:|:--------:|:-------:|:---:|
| 6 bytes| 24 bytes |2 bytes | 24 bytes | 8 bytes | ... |

The content of data depends of the value of ID

## List of IDs

### Scalar (1)
Store a scalar as a double (8 bytes)

| data    |
|:-------:|
| 8 bytes |

### Tensor (2)
Store a tensor of double. Data take the following shape

|order of the tensor| dimension           | data               |
|:-----------------:|:-------------------:|:------------------:|
| 4 bytes           | 4 bytes / order     | 8 bytes / elements |

- order of the tensor : `unsigned int`
- dimension : `unsigned int`
- data : `double`

### Meta Project (3)
Indicate that the next entry until the next `META_PROJECT` entry are related to the project `project name`.

| project name |
|:------------:|
| variable     |

If no `META_PROJECT` is present in the file, the entries are considered to belong to the `default` project
