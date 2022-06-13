#include "writer.hpp"

namespace DataMo {
Writer::Writer(std::string location) : _out_location(location) {
  _out_stream = std::ofstream(_out_location + _out_file, std::ios::binary);
}

void Writer::set_out_location(std::string new_loc) {
  _file_lock.lock();
  _out_stream.close();
  _out_location = new_loc;
  _out_stream = std::ofstream(_out_location + _out_file, std::ios::binary);
  _file_lock.unlock();
}

void Writer::set_out_file(std::string new_file) {
  _file_lock.lock();
  _out_stream.close();
  _out_file = new_file;
  _out_stream = std::ofstream(_out_location + _out_file, std::ios::binary);
  _file_lock.unlock();
}

Writer::~Writer() {
  _file_lock.lock();
  _out_stream.close();
}



} // namespace DataMo