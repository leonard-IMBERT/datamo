/**
 * @file writer.hpp
 * @author Imbert Leonard (imbert@subatech.in2p3.fr)
 * @brief Description of the writer and the differents items you can write
 * @version 0.1
 * @date 2022-06-13
 *
 * @copyright Copyright (c) 2022
 */
#include <torch/torch.h>

#include <fstream>
#include <mutex>
#include <string>

#ifndef DATA_MO_H
#define DATA_MO_H

/**
 * @brief Namespace containing all the library
 */
namespace DataMo {

/**
 * @brief The different writable types implemented
 *
 * For morem details, see the README.md at the root of the project
 */
enum WritableType {
  // Monitoring
  SCALAR = 0, /**< A simple scalar */
  TENSOR = 1, /**< A tensor */

  // Metadata
  META_PROJECT = 2, /**< Meta tag that specify the project */

  // String
  STRING = 3, /**< String data */
};

/**
 * @brief Abstract structure representing an item
 */
struct Item {
  std::string name;
  WritableType type;
  unsigned long size;
  const void* data_pointer = nullptr;
};

/**
 * @brief Implementation of the scalar item
 */
struct ScalarItem : public Item {
  double data;

  /**
   * @brief Construct a new Scalar Item object
   *
   * @param n Name of the item
   * @param d The value it take
   */
  ScalarItem(std::string n, double d) : data(d) {
    name = n;
    type = SCALAR;
    size = 8;
    data_pointer = &data;
  };
};

/**
 * @brief Implementation of the tensor item
 */
struct TensorItem : public Item {
  /**
   * @brief The tensor to log
   *
   * Implementation make it cloned on cpu, detached from the graph
   * and as float64
   */
  torch::Tensor data;

  /**
   * @brief Pointer to the order and dims data
   */
  int32_t * order_dims;

  /**
   * @brief
   *
   */
  size_t order_dims_size;

  /**
   * @brief Construct a new Tensor Item object
   *
   * @param n The name of the item
   * @param d The new tensor value
   */
  TensorItem(std::string n, torch::Tensor d) {
    name = n;
    type = TENSOR;
    data = d.clone().detach().cpu().to(torch::kFloat64).contiguous();

    data_pointer = data.data_ptr<double>();

    size_t orders = d.sizes().size();

    order_dims_size = orders + 1;
    order_dims = new int32_t[orders + 1];
    order_dims[0] = orders;

    size = 1;
    for (size_t order = 0; order < orders; order++) {
      order_dims[order + 1] = (size_t)d.size((int64_t)order);
      size = size * (size_t)d.size((int64_t)order);
    }

    // Take care here. The size of the writed tensor depends on the
    // implementation of double by the compiler
    size = size * sizeof(double);
  };

  ~TensorItem() { delete order_dims; }
};

/**
 * @brief Implementation of the meta entry: Project
 */
struct MetaProjectItem : public Item {
  /**
   * @brief Construct a new Meta Project Item object
   *
   * @param n Name of the project
   */
  MetaProjectItem(std::string n) {
    name = n;
    type = META_PROJECT;
    size = 0;
    data_pointer = nullptr;
  };
};

struct StringItem : public Item {
  std::string str;

  StringItem(std::string n, std::string s): str(s) {
    name = n;
    type = STRING;
    size = str.length();
    data_pointer = str.c_str();
  }
};

/**
 * @brief The writer that will write item in the .datamo file
 *
 * It is designed to be thread safe:
 * i.e., it use mutex to ensure no concurrent acces to the file by the instance
 * it ensure, all data have been flushed to the file before inputing new data
 *
 * Thet facts ensure that the data are writed in the order they were given to
 * the writer
 *
 * Beware if it is used by multiple threads: the data will be written in the
 * file in the same order the threads called it.
 */
class Writer {
 private:
  std::mutex _file_lock;
  std::ofstream _out_stream;

  std::string _out_file = "log.datamo";

  std::string _out_location;

 public:
  /**
   * @brief Construct a new Writer object
   *
   * @param location Place where to create the log file
   */
  Writer(std::string location);

  /**
   * @brief Destroy the Writer object
   */
  ~Writer();

  /**
   * @brief Set the out location object
   *
   * It SHOULD be terminated by a `/` considering it is appened
   * to the out file
   */
  void set_out_location(std::string);

  /**
   * @brief Set the name of the out file. It will still be place in
   * the out locatio0n
   *
   * /!\ Warning: You should not but if you give a path to this function
   * know that it will be appened to the out location resulting in undefined
   * behavior
   */
  void set_out_file(std::string);

  /**
   * @brief Write an item to the log file
   *
   * @param data The data to write
   */
  void write_data(Item* data);
};

}  // namespace DataMo

#endif
