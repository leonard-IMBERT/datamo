#include "writer.hpp"

#include <chrono>

namespace DataMo {
Writer::Writer(std::string location) : _out_location(location) {
  _out_stream = std::ofstream(_out_location + _out_file,
                              std::ios::binary | std::ios::app);
}

void Writer::set_out_location(std::string new_loc) {
  _file_lock.lock();
  _out_stream.close();
  _out_location = new_loc;
  _out_stream = std::ofstream(_out_location + _out_file,
                              std::ios::binary | std::ios::app);
  _file_lock.unlock();
}

void Writer::set_out_file(std::string new_file) {
  _file_lock.lock();
  _out_stream.close();
  _out_file = new_file;
  _out_stream = std::ofstream(_out_location + _out_file,
                              std::ios::binary | std::ios::app);
  _file_lock.unlock();
}

Writer::~Writer() {
  _file_lock.lock();
  _out_stream.close();
}

void Writer::write_data(Item *data) {
  using namespace std::chrono_literals;

  _file_lock.lock();

  const auto now = std::chrono::system_clock::now();
  const auto nowAsTimeT = std::chrono::system_clock::to_time_t(now);
  const auto nowMs = std::chrono::duration_cast<std::chrono::milliseconds>(
                         now.time_since_epoch()) %
                     1000;

  _out_stream.write("DATAMO", 6);

  char time_buffer[25];
  strftime(time_buffer, 25, "%d/%m/%Y~%T::", localtime(&nowAsTimeT));
  sprintf(time_buffer + 21, "%03.3d", (int)nowMs.count());
  // Exclude the null terminating character
  _out_stream.write(time_buffer, 24);

  int16_t type = (int16_t)data->type;
  _out_stream.write(reinterpret_cast<char *>(&type), sizeof(int16_t));

  char name_buffer[24] = {' '};
  if (data->name.size() > 24) {
    std::cout << "[DataMo] Warning: name " << data->name
              << " is more than 24 characters. It will be truncated."
              << std::endl;
  }

  snprintf(name_buffer, 24, "%-24.24s", data->name.c_str());

  _out_stream.write(name_buffer, 24);

  int64_t size = (int64_t)data->size;

  if (data->type == TENSOR) {
    // special case for the tensor, needs to write the dimensions also
    TensorItem *dataT = (TensorItem *)data;
    size += (dataT->order_dims_size * sizeof(int32_t));
  }
  _out_stream.write(reinterpret_cast<char *>(&size), sizeof(int64_t));

  if (data->type == TENSOR) {
    // special case for the tensor, needs to write the dimensions also
    TensorItem *dataT = (TensorItem *)data;
    _out_stream.write(reinterpret_cast<char *>(dataT->order_dims),
                      dataT->order_dims_size * sizeof(int32_t));
  }

  _out_stream.write(reinterpret_cast<char *>(data->data_pointer), data->size);

  _out_stream.flush();

  _file_lock.unlock();
}

}  // namespace DataMo