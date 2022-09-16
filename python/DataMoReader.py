import os.path as path
from enum import Enum
from typing import Callable, Union, Tuple
import struct
import asyncio

class Error(Exception):
  """Base class for exceptions in DataMo"""
  pass

class MalformedFile(Error):
  """Exception raised when DataMo is unable to read the log file

  Attributes:
      field: str -- The field DataMo was trying to read
      value: bytes -- The value DataMo read
      what: str -- Reason why DatoMo raised this exception
  """

  def __init__(self, field: str, value: bytes = b'', what: str = ''):
    self.field = field
    self.value = value
    self.what = what



class ReadableType(Enum):
  """The different readable type known
  """
  SCALAR = 0
  """A simple scalar"""
  TENSOR = 1
  """A tensor"""

  META_PROJECT = 2
  """Meta tag that specify the project"""

  STRING = 3
  """A string"""


def readTensorFromBuffer(buffer: bytes) -> Tuple[int, list, list]:
  """Transform a data buffer into a "tensor"
  """
  cursor = 0

  order = int.from_bytes(buffer[0:4], 'little')
  cursor += 4

  n_entries = 1
  dims = []

  while len(dims) < order:
    dim = int.from_bytes(buffer[cursor:cursor + 8], 'little')
    dims.append(dim)
    cursor += 8

    n_entries = n_entries * dim

  raw_data = []
  while len(raw_data) < n_entries:
    raw_data.append(struct.unpack('<d', buffer[cursor:cursor + 8])[0])
    cursor += 8

  return order, dims, raw_data

class Entry:
  """Class representing an entry
  """

  def __init__(self, entry_type: ReadableType, data: list = []):
    self.entry_type = entry_type
    self.data = data.copy()

class DataMoReader:
  """Class allowing to read from a DataMo file"""


  def __init__(self, file: str):
    """Construct a new DataMoReader

    file is optional when constructing but MUST be set before
    trying to read
    """
    self.file = file

    self.events = dict()
    self.events['default'] = dict()

    self.on_new_data_f: Union[Callable[[str, str], None], None] = None

    self.reading: bool = False

    self.selected: str = 'default'

  def sync_read(self):
    """Read the file synchronously
    """
    if self.file is None or not path.exists(self.file):
      raise OSError(f"File {self.file} does not exist")

    with open(self.file, 'rb') as file:
      file_content = file.read()

      offset: int = 0

      while offset < len(file_content) - 1:
        header: bytes = file_content[offset:offset + 64]
        offset += 64

        size: int = int.from_bytes(header[56:56 + 8], byteorder='little')

        data: bytes = file_content[offset:offset + size]
        offset += size

        chunk_result: Union[Tuple[str, str], None] = self.chunk_to_object(header, data)

        if chunk_result is not None and self.on_new_data_f is not None:
          self.on_new_data_f(chunk_result[0], chunk_result[1])

  async def read(self, watch = True):
    """Read the file asynchrnously
    """
    if self.file is None or not path.exists(self.file):
      raise OSError(f"File {self.file} does not exist")

    with open(self.file, 'rb') as file:
      self.reading = True

      while self.reading:
        header = file.read(64)

        while len(header) == 64:
          size = int.from_bytes(header[56:56+8], 'little')

          data = file.read(size)

          chunk_result = self.chunk_to_object(header, data)

          if self.on_new_data_f is not None and chunk_result is not None:
            self.on_new_data_f(chunk_result[0], chunk_result[1])

          header = file.read(64)

        if not watch:
          self.reading = False
        else:
          await asyncio.sleep(0.1)
    print("Stopping watching")


  def stop_reading(self) -> None:
    """Only used in watch mode when reading asynchronously

    Stop watching the file
    """
    self.reading = False

  def on_new_data(self, f: Callable[[str, str], None]) -> None:
    """Callback to call when a new data is read

    In sync mode, it will be called for each line of each
    pair (project, value)
    """
    self.on_new_data_f = f

  def chunk_to_object(self, header: bytes, data: bytes) -> Union[Tuple[str, str], None]:
    """Transform a chunk into event object and store it in ctx
    """
    magic_string = header[0: 6]

    if not magic_string == b'DATAMO':
      raise MalformedFile('Magic String', magic_string, "Expected magic_string to be b'DATAMO'")

    entry_type: int = int.from_bytes(header[30:32], 'little')
    entry_name: str = header[32:32+24].decode('utf-8').strip('\x00').strip()

    if entry_type == ReadableType.META_PROJECT.value:
      self.selected = entry_name

      if self.events.get(self.selected) is None:
        self.events[self.selected] = dict()

      return None

    if self.events[self.selected].get(entry_name) is None:
      self.events[self.selected][entry_name] = Entry(entry_type)

    parsed_data = None

    if entry_type == ReadableType.SCALAR.value: (parsed_data,) = struct.unpack('<d', data)
    elif entry_type == ReadableType.TENSOR.value: parsed_data = readTensorFromBuffer(data)
    elif entry_type == ReadableType.STRING.value: parsed_data = data.decode('utf-8')
    else:
      raise MalformedFile('Entry type', header[30:32], "Expected the type to be one present in ReadableType")

    self.events[self.selected][entry_name].data.append(
      (header[6:6+24].decode('utf-8'), parsed_data)
    )

    return (self.selected, entry_name)


