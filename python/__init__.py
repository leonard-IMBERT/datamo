"""Collection of tools to manipulate DataMo files in python
"""
__version__ = '0.3.2'
__author__ = 'Leonard Imbert <imbert@subatech.in2p3.fr>'

from .DataMoReader import DataMoReader, Entry, ReadableType, Error, MalformedFile
from .DataMoWriter import DataMoWriter, Item, ScalarItem, TensorItem, MetaProjectItem, WritableType
