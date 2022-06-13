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

  ScalarItem(std::string n, double d) : data(d) {
    name = n;
    type = SCALAR;
    size = 8;
    data_pointer = &data;
  };
};

struct TensorItem : public Item {
  torch::Tensor data;

  TensorItem(std::string n, torch::Tensor d) {
    name = n;
    type = TENSOR;
    data = d.clone().detach().cpu().to(torch::kFloat64).contiguous();


    data_pointer = data.data_ptr<double>();
    size = 1;
    for(unsigned int order = 0; order < d.sizes().size(); order ++) {
      size = size * d.size(order);
    }

    size = size * sizeof(double);
  };
};

struct MetaProjectItem : public Item {
  MetaProjectItem(std::string n) {
    name = n;
    type = META_PROJECT;
    size = 0;
    data_pointer = nullptr;
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