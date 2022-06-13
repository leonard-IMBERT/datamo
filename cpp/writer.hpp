#include <string>
#include <fstream>
#include <mutex>
#include <string>
#include <torch/torch.h>

#ifndef DATA_MO_H
#define DATA_MO_H

namespace DataMo {

enum WritableType {
  // Monitoring
  SCALAR,
  TENSOR,

  // Metadata
  META_PROJECT,
};

struct Item {
  std::string name;
  WritableType type;
  unsigned long size;
  void * data_pointer = nullptr;
};

struct ScalarItem : public Item {
  double data;

  std::string name;
  WritableType type = SCALAR;
  unsigned long size = 8;
  void * data_pointer = &data;

  ScalarItem(std::string n, double d) : name(n), data(d) {};
};

struct TensorItem : public Item {
  torch::Tensor data;

  std::string name;
  WritableType type = TENSOR;
  unsigned long size;
  void * data_pointer = &data;

  TensorItem(std::string n, torch::Tensor d) : name(n), data(d) {
    data.to(torch::)
  };
};

class Writer {
 private:
  std::mutex _file_lock;
  std::ofstream _out_stream;

  std::string _out_file = "log.datamo";

  std::string _out_location;
 public:
  Writer(std::string location);
  ~Writer();

  void set_out_location(std::string);
  void set_out_file(std::string);

  void write_data(Item * data);
};

} // namespace DataMo

#endif