from enum import Enum
from os import path
import torch
import tensorflow as tf
import numpy as np
from typing import Any
from datetime import datetime

class WritableType(Enum):
  """The different writable type known
  """
  SCALAR = 0
  """A simple scalar"""
  TENSOR = 1
  """A tensor"""

  META_PROJECT = 2
  """Meta tag that specify the project"""

class Item():
  """Abstract class that represent an item"""
  def __init__(
          self,
          name: str,
          itype: WritableType,
          size: int,
          data: Any
          ):
    self.name = name;
    """Name pf the item"""

    self.itype = itype
    """{{WritableType}} of the item"""

    self.size = size
    """Size (in bytes) of the item"""

    self.data = data
    """Data of the item"""

class ScalarItem(Item):
  """An item holding a Scala"""
  def __init__(self, name: str, data: float):
    super().__init__(name, WritableType.SCALAR, 8, float(data)) # Scalar are stored as float

class TensorItem(Item):
  """An item holding a tensor
     Support pytorch and tensorflow tensors
  """
  def __init__(self, name: str, data: torch.Tensor | tf.Tensor):
    if isinstance(data, torch.Tensor):
      raw_data = data.clone().detach().cpu().to(torch.float64).contiguous().numpy()
      self.dims = data.size()
      self.order = len(self.dims)
    elif isinstance(data, tf.Tensor):
      raw_data = data.numpy()
      self.dims = np.array(data.shape)
      self.order = len(self.dims)
    else:
      raise TypeError()

    super().__init__(name, WritableType.TENSOR, (np.prod(self.dims) * 8).item(), raw_data)

class MetaProjectItem(Item):
  """Meta project item"""
  def __init__(self, name: str):
    super().__init__(name, WritableType.META_PROJECT, 0, None)

class DataMoWriter():
  """Implementation of the writer"""
  def __init__(self, location: str):
    self.location = location
    """Folder in which the writer will write the log"""
    self.filename = 'log.datamo'
    """Name of the log file"""

    self.file = open(path.join(self.location, self.filename), 'ab')
    """Representation of the log file"""

  def set_out_location(self, location: str) -> None:
    """Set the output folder"""
    self.location = location
    if self.file is not None:
      self.file.close()

    self.file = open(path.join(self.location, self.filename), 'ab')

  def set_out_file(self, filename: str) -> None:
    """Set the output filename"""
    self.filename = filename
    if self.file is not None:
        self.file.close()

    self.file = open(path.join(self.location, self.filename), 'ab')

  def write_data(self, item: Item) -> None:
    """Write an item in the log file"""

    now = datetime.now()
    nowstr = f'{now.day:02}/{now.month:02}/{now.year:02}~{now.hour:02}:{now.minute:02}:{now.second:02}::{round(now.microsecond / 1000):03}'

    self.file.write(b'DATAMO')
    self.file.write(nowstr.encode('utf-8'))
    self.file.write(item.itype.value.to_bytes(2, 'little'))
    self.file.write(f'{item.name[0:24]:24}'.encode('utf-8'))

    if isinstance(item, TensorItem):
      self.file.write((item.size + 4 + item.order * 4).to_bytes(8, 'little'))
    else: self.file.write(item.size.to_bytes(8, 'little'))

    if isinstance(item, TensorItem):
      self.file.write(item.order.to_bytes(4, 'little'))
      for dim in item.dims:
        self.file.write(dim.to_bytes(4, 'little'))


    if item.data is not None:
      self.file.write(item.data)

    self.file.flush()
